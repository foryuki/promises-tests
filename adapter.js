
const PENDING = 'PENDING'
const FULFILLED = 'FULFILLED'
const REJECT = 'REJECT'

/**
 * 最基础版本
 * 1. promise 默认是一个类， 用的时候需要new ,创建的实例上都有一个 then 方法
 * 2. promise 有三个状态：pending | fulfilled | rejected
 * 3. promise 默认状态是 pending
 * 4. 只有 pending 状态可以转换成成功或失败状态
 * 5. 创建 Promise 实例时传入的函数会被赋予一个函数类型的参数：
 *    - resolve，它接收一个参数 value，代表异步操作返回的结果，当异步操作执行成功后，会调用 resolve 方法
 *    - reject，它接收一个参数 reason，代表异步操作返回的结果，当异步操作失败后，会调用 reject 方法
 * 6. 如果 new Promise 的时候报错，会变成失败态
 *
 * 版本2： 处理异步情况
 *
 * 版本3：实现 then 的链式调用
 *  如果一个 promise 的 then 方法中的函数（成功或失败）返回的结果是一个 promise 的话，
 * 会自动将这个 promise 执行，并且采用它的状态。
 *  如果成功，会将成功的结果向外层的下一个 then 传递。
 *
 * then 的特点：
 * 1. 只有两种情况会失败：1）返回一个失败的 promise  2）抛出异常
 * 2. 每次执行 promise 时，都会返回一个新的 promise 实例
 *
 */

/**
 *
 */
function resolvePromise(promise2, x, resolve, reject) {
  if (promise2 === x) {
    reject(new TypeError(' promise 和 x 指向同一对象，Chaining cycle detected for promise'))
  }

  if (typeof x === 'object' && x !== null || typeof x === 'function') {
    let called = false; // 防止别人的 promise 既调用了成功，又调用了失败
    try {
      let then = x.then // 取 then 有可能报错，可能 then 属性是通过 defineProperty 来定义的
      if (typeof then === 'function') { // 当前有 then 方法，姑且认为它是一个 Promise
        // 也可以直接用 x.then，但是防止 x.then 时又报错
        then.call(x, y => { // y 可能还是一个 promise, 直到解析出来的结果是一个普通值
          if (called) return;
          called = true // 防止多次调用成功或失败
          resolvePromise(promise2, y, resolve, reject) // 采用 Promise 成功的结果向下传递
        }, r => {
          if (called) return;
          called = true;
          reject(r) // 采用 promise 失败的结果向下传递
        })
      } else {
        // {then: 1}
        resolve(x) // 说明 x 是一个普通的对象，直接成功即可
      }
    } catch (e) {
      // promise 失败了，有可能还能调用成功
      if (called) {
        return
      };
      called = true;
      reject(e)
    }
  } else {
    // 说明 x 是一个普通值
    resolve(x)
  }
}
class Promise {
  constructor(executor) {
    this.status = PENDING // 初始值为 PENDING
    this.value = undefined
    this.reason = undefined

    this.onResolveCallbacks = []
    this.onRejectCallbacks = []

    const resolve = (value) => {
      if (this.status === PENDING) {
        this.value = value
        this.status = FULFILLED
        this.onResolveCallbacks.forEach(cb => cb(this.value)) // 执行 then 中回调
      }
    }

    const reject = (reason) => {
      if (this.status === PENDING) {
        this.reason = reason
        this.status = REJECT
        this.onRejectCallbacks.forEach(cb => cb(this.reason)) // 执行 then 中回调
      }
    }

    try {
      executor(resolve, reject)
    } catch (e) {
      console.log('e', e)
      reject(e)
    }
  }

  then(onFulfilled, onReject) {
    // onFulfilled, onReject 是可选参数
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : data => data
    onReject = typeof onReject === 'function' ? onReject : err => { throw err }

    let p2 = new Promise((resolve, reject) => { // executor 会立即执行
      // 同步情况
      if (this.status === FULFILLED) {

        // 加延迟是为了拿到 p2,否则下面拿不到 p2
        setTimeout(() => {
          // 加 try...catch是因为：外层加了 setTimeout 导致此处的报错无法被最外层的 try...catch 捕获到
          try {
            // x 可能是普通值，也可能是 promise
            let x = onFulfilled(this.value)
            // 判断 x 的值，去推导 p2 的状态
            resolvePromise(p2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      }

      if (this.status === REJECT) {

        setTimeout(() => {
          try {
            let x = onReject(this.reason)
            resolvePromise(p2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      }

      // 异步情况
      // 发布订阅，订阅 then 的参数，当 new Promise 里面的函数是异步 resolve 或者 reject 时，可以再执行 then 中的回调
      if (this.status === PENDING) {
        this.onResolveCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value);
              resolvePromise(p2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0)
        })
        this.onRejectCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onReject(this.reason);
              resolvePromise(p2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          }, 0)
        })
      }
    })
    return p2;
  }

  // static resolve(value) {
  //   return new Promise((resolve, reject) => {
  //     resolve(value)
  //   })
  // }
}

Promise.deferred = function () {
  let dfd = {};
   dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  })
  return dfd;
}

Promise.resolved = function (value) {
  return new Promise((resolve, reject) => {
    resolve(value)
  })
};

Promise.rejected = function (reason) {
  return new Promise((resolve, reject) => {
    reject(reason)
  })
};

module.exports = Promise
