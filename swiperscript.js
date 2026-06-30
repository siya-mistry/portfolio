document.addEventListener('DOMContentLoaded', () => {
    const swiper = new Swiper('.swiper', {
      loop: true,
      grabCursor: true,
      direction: 'vertical',

      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },

      slidesPerView: 'auto',
      spaceBetween: 16,
    });
  });
  