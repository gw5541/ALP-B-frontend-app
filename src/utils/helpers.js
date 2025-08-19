// 유틸리티 함수들

/**
 * 클래스명을 조건부로 결합하는 함수
 * @param  {...any} classes 
 * @returns {string}
 */
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * 날짜를 포맷팅하는 함수
 * @param {Date|string} date 
 * @param {string} locale 
 * @returns {string}
 */
export function formatDate(date, locale = 'ko-KR') {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * 숫자를 천 단위로 구분하여 포맷팅하는 함수
 * @param {number} num 
 * @returns {string}
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('ko-KR').format(num)
}

/**
 * 디바운스 함수
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 깊은 복사 함수
 * @param {any} obj 
 * @returns {any}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}
