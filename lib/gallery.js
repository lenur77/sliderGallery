const galleryClassName = 'gallery';
const galleryDraggableClassName = 'gallery-dragable';
const galleryLineContainerClassName = 'gallery-line-container';
const galleryLineClassName = 'gallery-line';
const gallerySlideClassName = 'gallery-slide';
const galleryDotsClassName = 'gallery-dots';
const galleryDotClassName = 'gallery-dot';
const galleryDotActiveClassName = 'gallery-dot--active';
const galleryNavClassName = 'gallery-nav';
const galleryNavLeftClassName = 'gallery-nav-left';
const galleryNavRightClassName = 'gallery-nav-right';
const galleryNavDisabledClassName = 'gallery-nav-disabled';


class Gallery {
  constructor(element, options = {}) {

    this.containerNode = element; //подключение галереи с общим классом Gallery
    this.size = element.childElementCount; //определение количества слайдов
    this.currentSlide = 0; //Начальный слайд
    this.currentSlideWasChanged = false; //остановка перемотки слайдов до начала действия
    this.settings = {
      margin: options.margin || 0
    } //настройки по умолчанию

    this.manageHTML = this.manageHTML.bind(this); //переопределение классов HTML только в нужном слайдере

    this.setEvents = this.setEvents.bind(this); //переопределение событий только в нужном слайдере

    this.resizeGallery = this.resizeGallery.bind(this); //переопределение изменений размеров  только в нужном слайдере
    this.startDrag = this.startDrag.bind(this); //переопределение начала перемотки
    this.stopDrag = this.stopDrag.bind(this); //переопределение конца перемотки  только в нужном слайдере
    this.dragging = this.dragging.bind(this); //переопределение расчетов движения
    this.setStylePosition = this.setStylePosition.bind(this); //переопределение стиля перемотки

    this.clickDots = this.clickDots.bind(this);
    this.moveToLeft = this.moveToLeft.bind(this);
    this.moveToRight = this.moveToRight.bind(this);
    this.changeCurrentSlide = this.changeCurrentSlide.bind(this);
    this.changeActiveDotClass = this.changeActiveDotClass.bind(this);
    this.changeNavDisabledClass = this.changeNavDisabledClass.bind(this);


    this.manageHTML();
    this.setParameters();
    this.setEvents();
  }

  /******************************/
  //добавление классов     
  manageHTML() {
    this.containerNode.classList.add(galleryClassName);
    this.containerNode.innerHTML = `
 <div class="${galleryLineContainerClassName}">
  <div class="${galleryLineClassName}">
   ${this.containerNode.innerHTML}
  </div> 
</div>
<div class="${galleryNavClassName}">
    <button class="${galleryNavLeftClassName}">Left</button> 
    <button class="${galleryNavRightClassName}">Right</button> 
</div> 
<div class="${galleryDotsClassName}"></div> 
`;

    //выбор слайдера
    this.lineContainerNode = this.containerNode.querySelector(`.${galleryLineContainerClassName}`);

    this.lineNode = this.containerNode.querySelector(`.${galleryLineClassName}`);
    this.dotsNode = this.containerNode.querySelector(`.${galleryDotsClassName}`);

    //создание массива из слайдов
    this.slideNodes = Array.from(this.lineNode.children).map((childNode) =>

      //оборачивание слайдов в обертку      
      wrapElementByDiv({
        element: childNode,
        className: gallerySlideClassName
      })
    );
    // console.log(Array.from(Array(this.size),keys()))
    this.dotsNode.innerHTML = Array.from(Array(this.size).keys()).map((key) => (
      `<button class="${galleryDotClassName} ${key === this.currentSlide ?     //активная точка дот
        galleryDotActiveClassName : ''}"></button>`
    )).join('');

    this.dotNodes = this.dotsNode.querySelectorAll(`.${galleryDotClassName}`);
    this.navLeft = this.containerNode.querySelector(`.${galleryNavLeftClassName}`);
    this.navRight = this.containerNode.querySelector(`.${galleryNavRightClassName}`);


  }
  /******************************/
  setParameters() {
    const coordsLineContainer = this.lineContainerNode.getBoundingClientRect(); // возврат размерa элемента и его позици относительно viewport
    this.width = coordsLineContainer.width;
    this.maximumX = -(this.size - 1) * (this.width + this.settings.margin); //кол-во слайдов - 1 * ширину слайда
    this.x = -this.currentSlide * (this.width + this.settings.margin); //размер сдвига (- первый слайд * на ширину слайда)

    //ширина слайдера (количество элементов * на ширину элемента + margin)
    this.lineNode.style.width = `${this.size * (this.width + this.settings.margin)}px`;
    this.setStylePosition(); //первоначальные параметры
    this.changeActiveDotClass()
    this.changeNavDisabledClass();
    // создание массива слайдов с добавлением ширины каждому
    Array.from(this.slideNodes).forEach((slideNode) => {
      slideNode.style.width = `${this.width}px`;
      slideNode.style.marginRight = `${this.settings.margin}px`;

    });
  }
  /******************************/

  setEvents() {
    this.debouncedResizeGallery = debounce(this.resizeGallery); //переопределение уменьшаемого через промежутки времени слайдера
    window.addEventListener('resize', this.debouncedResizeGallery); //изменение размеров слайда при изменении вьюпорта
    this.lineNode.addEventListener('pointerdown', this.startDrag);
    window.addEventListener('pointerup', this.stopDrag);
    window.addEventListener('pointercancel', this.stopDrag);
    //слежение за дотсами
    this.dotsNode.addEventListener('click', this.clickDots);
    this.navLeft.addEventListener('click', this.moveToLeft);
    this.navRight.addEventListener('click', this.moveToRight);

  }

  //  удаление слежения за слайдами
  destroyEvents() {
    window.removeEventListener('resize', this.debouncedResizeGallery);
    this.lineNode.removeEventListener('pointerdown', this.startDrag);
    window.removeEventListener('pointerup', this.stopDrag);
    window.removeEventListener('pointercancel', this.stopDrag);

    // удаление слежения за дотсами 
    this.dotsNode.removeEventListener('click', this.clickDots);
    this.navLeft.removeEventListener('click', this.moveToLeft);
    this.navRight.removeEventListener('click', this.moveToRight);
  }

  /******************************/
  resizeGallery() {
    this.setParameters();
  }

  /******************************/
  startDrag(evt) {
    this.currentSlideWasChanged = false; //остановка смены слайда до начала перемотки
    this.clickX = evt.pageX;
    this.startX = this.x; //место остановки перемотки
    this.resetStylePosition(); //удаление плавной прокрутки
    this.containerNode.classList.add(galleryDraggableClassName);
    window.addEventListener('pointermove', this.dragging);
  }

  stopDrag() {
    window.removeEventListener('pointermove', this.dragging); //остановка перемотки
    this.containerNode.classList.remove(galleryDraggableClassName);

    this.x = -this.currentSlide * (this.width + this.settings.margin); //размер сдвига (- первый слайд * на ширину слайда)  
    this.setStylePosition();
    this.setStyleTransition();
    this.changeCurrentSlide();

  }
  //  перемотка по оси Х от места клика (clickX)
  dragging(evt) {
    this.dragX = evt.pageX;
    const dragShift = this.dragX - this.clickX;
    const easing = dragShift / 5; // замедление отставания от края экрана (константа)
    this.x = Math.max(Math.min(this.startX + dragShift, easing), this.maximumX + easing); //выбор максимального и минимального значения  для остановки прокрутки(easing) вначале и конце слайдера
    // this.x = this.startX + dragShift;   //от точки последней остановки  до точки перемотки
    this.setStylePosition();

    //Смена активного слайда
    if (
      dragShift > 20 &&
      dragShift > 0 &&
      !this.currentSlideWasChanged &&
      this.currentSlide > 0
    ) {
      this.currentSlideWasChanged = true;
      this.currentSlide = this.currentSlide - 1;
    }
    if (
      dragShift < -20 &&
      dragShift < 0 &&
      !this.currentSlideWasChanged &&
      this.currentSlide < this.size - 1
    ) {
      this.currentSlideWasChanged = true;
      this.currentSlide = this.currentSlide + 1;
    }
  }

  clickDots(evt) {
    const dotNode = evt.target.closest('button'); //
    if (!dotNode) {
      return;
    }
    let dotNumber;
    for (let i = 0; i < this.dotNodes.length; i++) {
      if (this.dotNodes[i] === dotNode) {
        dotNumber = i;
        break;
      }
    }
    if (dotNumber === this.currentSlide) {
      return;
    }

    const countSwipes = Math.abs(this.currentSlide - dotNumber); //скорость перемещения слайдов(этот слайд - номер дотса)
    this.currentSlide = dotNumber;
    this.changeCurrentSlide(countSwipes);
  }

  moveToLeft() {
    if (this.currentSlide <= 0) {
      return;
    }

    this.currentSlide = this.currentSlide - 1;
    this.changeCurrentSlide();
  }

  moveToRight() {
    if (this.currentSlide >= this.size - 1) {
      return;
    }

    this.currentSlide = this.currentSlide + 1;
    this.changeCurrentSlide();
  }

  changeCurrentSlide(countSwipes) {
    this.x = -this.currentSlide * (this.width + this.settings.margin); //размер сдвига (- первый слайд * на ширину слайда)  
    this.setStylePosition();
    this.setStyleTransition(countSwipes);
    this.changeActiveDotClass();
    this.changeNavDisabledClass();
  };

  changeActiveDotClass() {
    for (let i = 0; i < this.dotNodes.length; i++) {
      this.dotNodes[i].classList.remove(galleryDotActiveClassName);
    }

    this.dotNodes[this.currentSlide].classList.add(galleryDotActiveClassName);
  };

  changeNavDisabledClass() {
    if (this.currentSlide <= 0) {
      this.navLeft.classList.add(galleryNavDisabledClassName);
    } else {
      this.navLeft.classList.remove(galleryNavDisabledClassName);
    }

    if (this.currentSlide >= this.size - 1) {
      this.navRight.classList.add(galleryNavDisabledClassName);
    } else {
      this.navRight.classList.remove(galleryNavDisabledClassName);
    }
  }

  //добавление стиля для перемотки
  setStylePosition() {
    this.lineNode.style.transform = `translate3d(${this.x}px, 0, 0)`;
  }

  //добавление стиля плавной перемотки
  setStyleTransition(countSwipes = 1) {
    this.lineNode.style.transition = `all ${0.3 * countSwipes}s ease 0s`;
  }
  //удаление стиля плавной перемотки
  resetStylePosition() {
    this.lineNode.style.transition = `all 0s ease 0s`;
  }
}

// вспомогательые функции


//  для добавления класса-обертки
function wrapElementByDiv({
  element,
  className
}) {
  const wrapperNode = document.createElement('div');
  wrapperNode.classList.add(className);

  element.parentNode.insertBefore(wrapperNode, element);
  wrapperNode.appendChild(element);

  return wrapperNode;
}

// debounce — функция, которая «откладывает» вызов другой функции до того момента, когда с последнего вызова пройдёт определённое количество времени.
function debounce(func, time = 100) {
  let timer;
  return function (event) {
    clearTimeout(timer);
    timer = setTimeout(func, time, event);
  }
}
