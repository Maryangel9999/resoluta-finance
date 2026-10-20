const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const scrollTopBtn = document.querySelector(".scroll-top");
const revealItems = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll("[data-counter]");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mainNav.classList.remove("open"));
  });
}

const observeReveal = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
};

const animateCounter = (el) => {
  const target = Number(el.dataset.counter);
  const suffix = target >= 1000 ? "k" : "";
  const duration = 1200;
  const start = performance.now();

  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(progress * target);
    const displayValue = suffix ? `${value / 1000}k` : value;

    if (target >= 1000) {
      el.textContent = `${displayValue}`;
    } else {
      el.textContent = value;
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (target >= 1000) {
        el.textContent = `${target / 1000}k`;
      } else {
        el.textContent = target;
      }
    }
  };

  requestAnimationFrame(update);
};

const setupCounters = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => observer.observe(counter));
};

const handleScrollTop = () => {
  if (window.scrollY > 400) {
    scrollTopBtn.classList.add("visible");
  } else {
    scrollTopBtn.classList.remove("visible");
  }
};

if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

window.addEventListener("scroll", handleScrollTop);

document.addEventListener("DOMContentLoaded", () => {
  observeReveal();
  setupCounters();
  handleScrollTop();
});

document.getElementById("contactForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.textContent = "Mensagem enviada!";
  button.disabled = true;

  setTimeout(() => {
    button.textContent = "Enviar";
    button.disabled = false;
    event.currentTarget.reset();
  }, 2000);
});
