// Seção "Por que o BB" — o scroll vertical, enquanto a seção está `sticky`,
// é convertido em translateX() horizontal dos cards. Nada de bibliotecas:
// só leitura de layout (getBoundingClientRect) + escrita de transform,
// throttled em requestAnimationFrame para não gerar reflow a cada frame.
(function () {
  const outer = document.getElementById("cardsScrollOuter");
  const sticky = document.querySelector(".cards-sticky");
  const track = document.getElementById("cardsTrack");
  if (!outer || !sticky || !track) return;

  let maxTranslate = 0;
  let ticking = false;

  function measure() {
    const trackWidth = track.scrollWidth;
    const viewportWidth = outer.clientWidth;
    maxTranslate = Math.max(0, trackWidth - viewportWidth);
    // outer = altura do sticky (o "quadro" parado na tela) + a distância
    // extra que o track precisa andar, então 1px de scroll vertical
    // (enquanto pinado) = 1px de translateX.
    const stickyHeight = sticky.offsetHeight;
    outer.style.height = `${stickyHeight + maxTranslate}px`;
  }

  function update() {
    ticking = false;
    if (maxTranslate <= 0) {
      track.style.transform = "translate3d(0,0,0)";
      return;
    }
    const rect = outer.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / maxTranslate));
    track.style.transform = `translate3d(${-progress * maxTranslate}px,0,0)`;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function onResize() {
    measure();
    update();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  measure();
  update();
})();

// Seção "Ourocard" — sem scroll-scrub (o seek frame a frame não avança de
// forma confiável em todo navegador). Em vez disso: assim que a seção entra
// na tela, o vídeo toca uma única vez, do começo ao fim, de forma fluida
// (reprodução normal do <video>, não dirigida pelo scroll). Quando ele
// termina — cartão parado no frame final do próprio arquivo — o texto
// entra (opacity + pequeno deslocamento horizontal, via transição CSS).
(function () {
  const section = document.getElementById("ourocardSection");
  const video = document.getElementById("ourocardVideo");
  const text = document.getElementById("ourocardText");
  if (!section || !video || !text) return;

  let hasStarted = false;

  function revealText() {
    text.classList.add("is-visible");
  }

  function playOnce() {
    if (hasStarted) return;
    hasStarted = true;
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Autoplay bloqueado por algum motivo: não trava a seção — mostra
        // o texto mesmo assim, com o vídeo parado no primeiro frame.
        revealText();
      });
    }
  }

  video.addEventListener("ended", revealText);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            playOnce();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(section);
  } else {
    // Fallback sem IntersectionObserver: toca assim que estiver disponível.
    playOnce();
  }
})();
