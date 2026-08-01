/* Chat console for Claude Code OS — streams from /api/chat (SSE over fetch). */
(function () {
  const CONTEXT_CHARS = 200000 * 3.5; // rough chars-per-token estimate

  function ChatConsole(root, opts = {}) {
    const els = {
      bezel: root.querySelector('.chat-bezel'),
      log: root.querySelector('.chat-log'),
      input: root.querySelector('.chat-input'),
      send: root.querySelector('.send-btn'),
      model: root.querySelector('.model-select'),
      effort: root.querySelector('.effort-select'),
      effortBars: root.querySelectorAll('.bars i'),
      ctxCells: root.querySelectorAll('.ctx-cells i'),
      ctxPct: root.querySelector('.ctx-pct'),
      voice: root.querySelector('.voice-btn:not(.tts-btn)'),
      tts: root.querySelector('.tts-btn'),
      council: root.querySelector('#council-pill'),
      newChat: root.querySelectorAll('.js-new-chat'),
      cta: root.querySelector('.hero-cta'),
    };

    let messages = [];
    let busy = false;
    let councilOn = false;
    let ttsOn = false;

    function speak(text) {
      if (!ttsOn || !window.speechSynthesis || !text) return;
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(text.slice(0, 600)));
    }

    function updateEffortBars() {
      const level = { low: 1, medium: 2, high: 3 }[els.effort.value] || 2;
      els.effortBars.forEach((bar, i) => bar.classList.toggle('on', i < level));
    }

    function updateContextMeter() {
      const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
      const pct = Math.min(100, Math.max(messages.length ? 1 : 0, Math.round((chars / CONTEXT_CHARS) * 100)));
      const onCells = Math.round((pct / 100) * els.ctxCells.length);
      els.ctxCells.forEach((c, i) => c.classList.toggle('on', i < Math.max(messages.length ? 1 : 0, onCells)));
      els.ctxPct.textContent = pct + '%';
    }

    function addMessage(role, text, who) {
      const div = document.createElement('div');
      div.className = 'msg msg-' + role;
      if (role === 'assistant') {
        div.innerHTML = '<div class="who"></div><div class="body"></div>';
        div.querySelector('.who').textContent = who || opts.agentName || 'JARVIS';
        div.querySelector('.body').textContent = text;
      } else {
        div.textContent = text;
      }
      els.log.appendChild(div);
      els.log.scrollTop = els.log.scrollHeight;
      return div;
    }

    /* Route one question through the Ministry of Experts council. */
    async function sendCouncil(text) {
      const res = await fetch('/api/council', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let verdict = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop();
        for (const chunk of chunks) {
          const eventLine = chunk.split('\n').find((l) => l.startsWith('event: '));
          const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
          if (!eventLine || !dataLine) continue;
          let payload;
          try { payload = JSON.parse(dataLine.slice(6)); } catch { continue; }
          const event = eventLine.slice(7).trim();
          if (event === 'expert') {
            addMessage('assistant', payload.text, 'EXPERT · ' + payload.name.toUpperCase());
          } else if (event === 'verdict') {
            verdict = payload.text;
            addMessage('assistant', verdict, '👑 CORE VERDICT · ' + payload.name.toUpperCase());
          } else if (event === 'error') {
            addMessage('error', '⚠ ' + payload.message).className = 'msg msg-error';
          }
        }
      }
      return verdict;
    }

    async function send() {
      const text = els.input.value.trim();
      if (!text || busy) return;
      els.input.value = '';
      els.bezel.classList.add('chatting');
      messages.push({ role: 'user', content: text });
      addMessage('user', text);
      updateContextMeter();

      busy = true;
      els.send.disabled = true;

      if (councilOn || els.model.value === 'ministry') {
        try {
          const verdict = await sendCouncil(text);
          if (verdict) { messages.push({ role: 'assistant', content: verdict }); speak(verdict); }
        } catch (err) {
          addMessage('assistant', '⚠ ' + err.message, 'COUNCIL');
        }
        updateContextMeter();
        busy = false;
        els.send.disabled = false;
        els.input.focus();
        return;
      }

      const div = addMessage('assistant', '');
      const body = div.querySelector('.body');
      body.innerHTML = '<span class="cursor"></span>';
      let reply = '';

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages, model: els.model.value, effort: els.effort.value }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop();
          for (const chunk of chunks) {
            const eventLine = chunk.split('\n').find((l) => l.startsWith('event: '));
            const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
            if (!eventLine || !dataLine) continue;
            const event = eventLine.slice(7).trim();
            let payload;
            try { payload = JSON.parse(dataLine.slice(6)); } catch { continue; }
            if (event === 'delta') {
              reply += payload.text;
              body.textContent = reply;
              body.insertAdjacentHTML('beforeend', '<span class="cursor"></span>');
              els.log.scrollTop = els.log.scrollHeight;
            } else if (event === 'error') {
              const err = document.createElement('div');
              err.className = 'msg msg-error';
              err.textContent = '⚠ ' + payload.message;
              els.log.appendChild(err);
            }
          }
        }
      } catch (err) {
        const errDiv = document.createElement('div');
        errDiv.className = 'msg msg-error';
        errDiv.textContent = '⚠ ' + err.message;
        els.log.appendChild(errDiv);
      }

      body.textContent = reply;
      if (reply) { messages.push({ role: 'assistant', content: reply }); speak(reply); }
      updateContextMeter();
      busy = false;
      els.send.disabled = false;
      els.input.focus();
    }

    function newChat() {
      messages = [];
      els.log.innerHTML = '';
      els.bezel.classList.remove('chatting');
      updateContextMeter();
      els.input.focus();
    }

    if (els.council) {
      els.council.addEventListener('click', () => {
        councilOn = !councilOn;
        els.council.classList.toggle('active', councilOn);
      });
    }
    if (els.tts) {
      els.tts.addEventListener('click', () => {
        ttsOn = !ttsOn;
        els.tts.classList.toggle('listening', ttsOn);
        if (!ttsOn && window.speechSynthesis) speechSynthesis.cancel();
      });
    }
    els.send.addEventListener('click', send);
    els.input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); send(); } });
    els.effort.addEventListener('change', updateEffortBars);
    els.newChat.forEach((btn) => btn.addEventListener('click', newChat));
    if (els.cta) els.cta.addEventListener('click', () => els.input.focus());

    // Voice input via the Web Speech API where available
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR && els.voice) {
      const rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = false;
      let listening = false;
      rec.onresult = (ev) => { els.input.value = ev.results[0][0].transcript; };
      rec.onend = () => { listening = false; els.voice.classList.remove('listening'); };
      els.voice.addEventListener('click', () => {
        if (listening) { rec.stop(); return; }
        listening = true;
        els.voice.classList.add('listening');
        rec.start();
      });
    } else if (els.voice) {
      els.voice.addEventListener('click', () => alert('Voice input needs a browser with the Web Speech API (Chrome/Edge).'));
    }

    updateEffortBars();
    updateContextMeter();
    return { newChat };
  }

  window.ChatConsole = ChatConsole;
})();
