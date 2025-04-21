import { Component, AfterViewInit } from '@angular/core';
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';

@Component({
  selector: 'app-avis',
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css']
})
export class AvisComponent implements AfterViewInit {
  swiper: Swiper | undefined;

  ngAfterViewInit(): void {
    this.swiper = new Swiper('.avis-swiper', {
      loop: true,
      spaceBetween: 30,
      slidesPerView: 1,
      autoplay: {
        delay: 5000,
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev'
      },
      breakpoints: {
        768: {
          slidesPerView: 2
        }
      }
    });
  }
}
