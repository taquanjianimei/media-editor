import axios from 'axios'
import { get, isFunction } from 'lodash'

const BlobMediaType = {
  mp3: 'audio/mpeg',
  webm: 'audio/webm',
  png: 'image/jpeg',
  mp4: 'video/mpeg'
}

export function createWorker (workerPath) {
  const worker = new Worker(workerPath)
  return worker
}

export function createTimeoutPromise (time) {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve()
    }, time)
  )
}

export function blobToArrayBuffer (blob) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onload = function () {
      resolve(fileReader.result)
    }

    fileReader.onerror = function (evt) {
      const err1 = get(evt, 'target.error.code', 'NO CODE')
      const err2 = get(fileReader, 'error.code', 'NO CODE')

      reject(new Error(`fileReader read blob error: ${err1} or ${err2}`))
    }

    fileReader.readAsArrayBuffer(blob)
  })
}

export function pmToPromiseWithProgress (worker, postInfo, progressCallback) {
  let duration
  let currentTime = 0
  const durationReg = /Duration: (.+), start/
  const currentTimeReg = /time=(.+) bitrate/
  const result = {
    buffer: null,
    logs: []
  }

  return new Promise((resolve, reject) => {
    const successHandler = function (event) {
      result.logs.push(get(event, 'data.data', '').toString())

      switch (event.data.type) {
        case 'stdout':
        case 'stderr':
          const msg = get(event, 'data.data', '')
          if (durationReg.test(msg)) {
            duration = timeToMillisecond(
              msg.match(durationReg)[1] || '00:00:01'
            )
          } else if (currentTimeReg.test(msg)) {
            currentTime = timeToMillisecond(
              msg.match(currentTimeReg)[1] || '00:00:00'
            )
          }

          const progress = currentTime / duration || 0

          progressCallback &&
            progressCallback({
              progress: progress >= 0.999 ? 0.999 : progress,
              currentTime,
              duration
            })
          console.log('worker stdout: ', event.data.data)
          break

        case 'start':
          console.log('worker receive your command and start to work:)')
          break

        case 'done':
          progressCallback &&
            progressCallback({ progress: 1, currentTime, duration })
          worker.removeEventListener('message', successHandler)
          result.buffer = get(event, 'data.data.MEMFS.0.data', null)
          resolve(result)
          break

        case 'error':
          worker.removeEventListener('message', successHandler)
          reject(event.data.data)
          break

        default:
          break
      }
    }

    const failHandler = function (error) {
      worker.removeEventListener('error', failHandler)
      reject(error)
    }

    worker.addEventListener('message', successHandler)
    worker.addEventListener('error', failHandler)
    postInfo && worker.postMessage(postInfo)
  })
}

export function pmToPromise (worker, postInfo) {
  const result = {
    buffer: null,
    logs: []
  }

  return new Promise((resolve, reject) => {
    const successHandler = function (event) {
      result.logs.push(get(event, 'data.data', '').toString())

      switch (event.data.type) {
        case 'stdout':
          // case 'stderr':
          console.log('worker stdout: ', event.data.data)
          break

        case 'start':
          console.log('worker receive your command and start to work:)')
          break

        case 'done':
          worker.removeEventListener('message', successHandler)
          result.buffer = get(event, 'data.data.MEMFS.0.data', null)
          resolve(result)
          break

        case 'error':
          worker.removeEventListener('message', successHandler)
          reject(event.data.data)
          break

        default:
          break
      }
    }

    const failHandler = function (error) {
      worker.removeEventListener('error', failHandler)
      reject(error)
    }
    worker.addEventListener('message', successHandler)
    worker.addEventListener('error', failHandler)
    postInfo && worker.postMessage(postInfo)
  })
}

export function waitForWorkerIsReady (worker, onSuccess, onFail) {
  return new Promise((resolve, reject) => {
    const handleReady = function (event) {
      if (event.data.type === 'ready') {
        worker.removeEventListener('message', handleReady)
        onSuccess && onSuccess()
        resolve()
      }
    }
    const handleError = err => {
      worker.removeEventListener('error', handleError)
      onFail && onFail(err)
      reject(err)
    }
    worker.addEventListener('message', handleReady)
    worker.addEventListener('error', handleError)
  })
}

export function getClipCommand (arrayBuffer, st, et) {
  const type = getMediaType()
  return {
    type: 'run',
    arguments: `-ss ${st} -i input.${type} ${
      et ? `-t ${et} ` : ''
    }-acodec copy output.${type}`.split(' '),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer),
        name: `input.${type}`
      }
    ]
  }
}

export async function getCombineCommand (audioBuffers) {
  const type = getMediaType()
  const files = audioBuffers.map((arrayBuffer, index) => ({
    data: new Uint8Array(arrayBuffer),
    name: `input${index}.${type}`
  }))
  const txtContent = [files.map(f => `file '${f.name}'`).join('\n')]
  const txtBlob = new Blob(txtContent, { type: 'text/txt' })
  const fileArrayBuffer = await blobToArrayBuffer(txtBlob)
  files.push({
    data: new Uint8Array(fileArrayBuffer),
    name: 'filelist.txt'
  })

  return {
    type: 'run',
    arguments: `-f concat -i filelist.txt -c copy output.${type}`.split(' '),
    MEMFS: files
  }
}

export function getTransformSelfCommand (arrayBuffer) {
  const type = getMediaType()
  return {
    type: 'run',
    arguments: `-i input.${type} -vcodec copy -acodec copy output.${type}`.split(
      ' '
    ),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer),
        name: `input.${type}`
      }
    ]
  }
}

export function getConvertCommand (arrayBuffer, originType) {
  const type = getMediaType()
  return {
    type: 'run',
    arguments: `-i input.${originType} -vn -y output.${type}`.split(' '),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer),
        name: `input.${originType}`
      }
    ]
  }
}

export function getClipConvertCommand (arrayBuffer, originType, st, et) {
  const type = getMediaType()
  return {
    type: 'run',
    arguments: `-ss ${st} -i input.${originType} ${
      et ? `-t ${et} ` : ''
    }-y output.${type}`.split(' '),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer),
        name: `input.${originType}`
      }
    ]
  }
}

export function isAudio (audio) {
  return (
    audio &&
      isFunction(audio.play) &&
      isFunction(audio.pause) &&
      isFunction(audio.canPlayType)
  )
}

export function audioBufferToBlob (arrayBuffer) {
  const type = getMediaType()
  const blob = new Blob([arrayBuffer], { type: toBlobMediaType(type) })
  return blob
}

export async function blobToAudio (blob) {
  const url = URL.createObjectURL(blob)
  return Promise.resolve(new Audio(url))
}

export function blobToUrl (blob) {
  const url = URL.createObjectURL(blob)
  return url
//   return new Promise((resolve, reject) => {
//     const fileReader = new FileReader()
//     fileReader.onload = () => {
//       resolve(fileReader.result)
//     }
//     fileReader.readAsDataURL(blob)
//   })
}

export async function audioToBlob (audio) {
  const url = audio.src
  if (url) {
    return axios({
      url,
      method: 'get',
      responseType: 'arraybuffer'
    }).then(async res => {
      const arrayBuffer = res.data
      const contentType = res.headers['content-type']
      const file = new File([arrayBuffer], 'result', {
        type: contentType
      })

      return file
    })
  } else {
    return Promise.resolve(null)
  }
}

export async function audioToArrayBuffer (audio) {
  const url = audio.src
  if (url) {
    return axios({
      url,
      method: 'get',
      responseType: 'arraybuffer'
    }).then(async res => {
      const arrayBuffer = res.data
      return arrayBuffer
    })
  } else {
    return Promise.resolve(null)
  }
}

export function timeout (time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('timeout in audioSculptor!')), time)
  })
}

let mediaType
export function setMediaType (type) {
  mediaType = type
}

export function getMediaType () {
  return mediaType
}

function timeToMillisecond (time) {
  const [hour, minute, second] = time.split(':').map(str => parseFloat(str))
  let millisecond = 0
  millisecond += second * 1000
  millisecond += minute * 60 * 1000
  millisecond += hour * 60 * 60 * 1000
  return millisecond
}

function toBlobMediaType (mediaType) {
  return BlobMediaType[mediaType]
}
