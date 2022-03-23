import {
  createWorker,
  createTimeoutPromise,
  blobToArrayBuffer,
  waitForWorkerIsReady,
  pmToPromise,
  getCombineCommand,
  getClipCommand,
  audioBufferToBlob,
  blobToAudio,
  blobToUrl,
  audioToBlob,
  audioToArrayBuffer,
  timeout,
  setMediaType,
  getTransformSelfCommand,
  getConvertCommand,
  pmToPromiseWithProgress,
  getClipConvertCommand,
  isAudio
} from './util'
import { isNumber } from 'lodash'

export default class Editor {
  constructor (conf) {
    conf = conf || {}
    this.defaultTimeout = conf.timeout || 30 * 1000
  }

    open = (conf) => {
      const { workerPath, mediaType, onSuccess, onFail } = conf
      setMediaType(mediaType)
      const worker = createWorker(workerPath)
      const p1 = waitForWorkerIsReady(worker, onSuccess, onFail)
      const p2 = createTimeoutPromise(30 * 1000)
      this.worker = worker
      return Promise.race([p1, p2])
    };

    close = () => {
      this.worker.terminate()
      this.worker = null
    };

    innerSplice = async (
      originBlob,
      startSecond,
      endSecond,
      insertBlob
    ) => {
      const ss = startSecond
      const es = isNumber(endSecond) ? endSecond : this.end
      const logs = []

      insertBlob = insertBlob || (endSecond && !isNumber(endSecond)
        ? endSecond
        : null)

      const originAb = await blobToArrayBuffer(originBlob)
      let leftSideArrBuf
      let rightSideArrBuf

      if (ss === 0 && es === this.end) {
        // 裁剪全部
        return { blob: insertBlob, logs: [] } || null
      } else if (ss === 0) {
        // 从头开始裁剪
        const result = await pmToPromise(
          this.worker,
          getClipCommand(originAb, es)
        )
        rightSideArrBuf = result.buffer
        logs.push(result.logs)
      } else if (ss !== 0 && es === this.end) {
        // 裁剪至尾部
        const result = await pmToPromise(
          this.worker,
          getClipCommand(originAb, 0, ss)
        )
        leftSideArrBuf = result.buffer
        logs.push(result.logs)
      } else {
        // 局部裁剪
        const result1 = await pmToPromise(
          this.worker,
          getClipCommand(originAb, 0, ss)
        )
        leftSideArrBuf = result1.buffer
        logs.push(result1.logs)

        const result2 = await pmToPromise(
          this.worker,
          getClipCommand(originAb, es)
        )
        rightSideArrBuf = result2.buffer
        logs.push(result2.logs)
      }

      const arrBufs = []
      leftSideArrBuf && arrBufs.push(leftSideArrBuf)
      insertBlob && arrBufs.push(await blobToArrayBuffer(insertBlob))
      rightSideArrBuf && arrBufs.push(rightSideArrBuf)

      const combindResult = await pmToPromise(
        this.worker,
        await getCombineCommand(arrBufs)
      )

      logs.push(combindResult.logs)

      return {
        blob: audioBufferToBlob(combindResult.buffer),
        logs
      }
    };

    splice = async (
      originBlob,
      startSecond,
      endSecond,
      insertBlob
    ) => {
      return Promise.race([
        this.innerSplice(originBlob, startSecond, endSecond, insertBlob),
        timeout(this.defaultTimeout)
      ])
    };

    convert = async (
      originBlob,
      targetType,
      timeoutValue,
      progressCallback
    ) => {
      return Promise.race([
        this.innerConvert(originBlob, targetType, progressCallback),
        timeout(timeoutValue || this.defaultTimeout)
      ])
    };

    innerConvert = async (
      originBlob,
      originType,
      progressCallback
    ) => {
      const originAb = await blobToArrayBuffer(originBlob)
      const result = await pmToPromiseWithProgress(
        this.worker,
        getConvertCommand(originAb, originType),
        progressCallback
      )
      const resultArrBuf = result.buffer
      return {
        blob: audioBufferToBlob(resultArrBuf),
        logs: [result.logs]
      }
    };

    innerTransformSelf = async (originBlob) => {
      const originAb = await blobToArrayBuffer(originBlob)
      const result = await pmToPromise(
        this.worker,
        getTransformSelfCommand(originAb)
      )
      const resultArrBuf = result.buffer

      return {
        blob: audioBufferToBlob(resultArrBuf),
        logs: [result.logs]
      }
    };

    transformSelf = async (originBlob) => {
      return Promise.race([
        this.innerTransformSelf(originBlob),
        timeout(this.defaultTimeout)
      ])
    };

    clip = async (
      originBlob,
      startSecond,
      endSecond
    ) => {
      return Promise.race([
        this.innerClip(originBlob, startSecond, endSecond),
        timeout(this.defaultTimeout)
      ])
    };

    innerClip = async (
      originBlob,
      startSecond,
      endSecond
    ) => {
      const ss = startSecond
      const d = isNumber(endSecond) ? endSecond - startSecond : this.end
      const originAb = await blobToArrayBuffer(originBlob)
      const logs = []
      let resultArrBuf
      if (d === this.end) {
        const result = await pmToPromise(
          this.worker,
          getClipCommand(originAb, ss)
        )
        resultArrBuf = result.buffer
        logs.push(result.logs)
      } else {
        const result = await pmToPromise(
          this.worker,
          getClipCommand(originAb, ss, d)
        )
        resultArrBuf = result.buffer
        logs.push(logs)
      }

      return {
        blob: audioBufferToBlob(resultArrBuf),
        logs
      }
    };

    innerConcat = async (blobs) => {
      const arrBufs = []

      for (let i = 0; i < blobs.length; i++) {
        arrBufs.push(await blobToArrayBuffer(blobs[i]))
      }

      const result = await pmToPromise(
        this.worker,
        await getCombineCommand(arrBufs)
      )

      const concatBlob = audioBufferToBlob(result.buffer)
      return {
        blob: concatBlob,
        logs: [result.logs]
      }
    };

    clipConvert = async (
      arrayBuffer,
      originType,
      startSecond,
      endSecond,
      progressCallback
    ) => {
      return Promise.race([
        this.innerClipConvert(
          arrayBuffer,
          originType,
          startSecond,
          endSecond,
          progressCallback
        ),
        timeout(this.defaultTimeout)
      ])
    };

    innerClipConvert = async (
      arrayBuffer,
      originType,
      startSecond,
      endSecond,
      progressCallback
    ) => {
      const result = await pmToPromiseWithProgress(
        this.worker,
        getClipConvertCommand(arrayBuffer, originType, startSecond, endSecond),
        progressCallback
      )
      const resultArrBuf = result.buffer
      return {
        blob: audioBufferToBlob(resultArrBuf),
        logs: [result.logs]
      }
    };

    concat = async (blobs) => {
      return Promise.race([
        this.innerConcat(blobs),
        timeout(this.defaultTimeout)
      ])
    };

    toBlob (audio) {
      return audioToBlob(audio)
    }

    toAudio (blob) {
      return blobToAudio(blob)
    }

    toUrl (blob) {
      return blobToUrl(blob)
    }

    custom (config) {
      const { timeout: inputTimeout } = config
      return Promise.race([
        this.innerCustom(config),
        timeout(inputTimeout || this.defaultTimeout)
      ])
    }

    async innerCustom (config) {
      const { commandLine, audios, progressCallback } = config
      const MEMFS = []
      const audioNames = Object.keys(audios)
      for (let index = 0; index < audioNames.length; index++) {
        const name = audioNames[index]
        const audio = audios[name]
        let arrayBuffer

        if (isAudio(audio)) {
          arrayBuffer = await audioToArrayBuffer(audio)
        } else if (audio instanceof Blob) {
          arrayBuffer = await blobToArrayBuffer(audio)
        } else {
          arrayBuffer = audio
        }

        MEMFS.push({
          name,
          data: new Uint8Array(arrayBuffer)
        })
      }

      const result = await pmToPromiseWithProgress(
        this.worker,
        {
          type: 'run',
          arguments: commandLine.split(' '),
          MEMFS
        },
        progressCallback
      )

      return {
        blob: audioBufferToBlob(result.buffer),
        logs: [result.logs]
      }
    }
}
