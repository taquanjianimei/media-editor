<template>
  <div class="container">
    <div class="upload-list">
      <div class="upload-item">
        <div class="upload-title">视频：</div>
        <el-upload
          class="file-uploader"
          action=""
          :on-remove="handleRemove('video')"
          :on-change="
            (file, fileList) => fileUploadChange('video', file, fileList)
          "
          :before-upload="beforeVideoUpload"
          :auto-upload="false"
          :limit="1"
          :multiple="false"
          accept=".mp4"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
      </div>
      <div class="upload-item">
        <div class="upload-title">音频：</div>
        <el-upload
          class="file-uploader"
          action=""
          :on-remove="handleRemove('audio')"
          :on-change="
            (file, fileList) => fileUploadChange('audio', file, fileList)
          "
          :before-upload="beforeAudioUpload"
          :auto-upload="false"
          :limit="1"
          :multiple="false"
          accept=".mp3"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
      </div>
      <div class="upload-item">
        <div class="upload-title">图片：</div>
        <el-upload
          class="file-uploader"
          action=""
          :on-remove="handleRemove('img')"
          :on-change="
            (file, fileList) => fileUploadChange('img', file, fileList)
          "
          :before-upload="beforeImgUpload"
          :auto-upload="false"
          :limit="1"
          :multiple="false"
          accept="*.png,.jpg,.gif"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
      </div>
    </div>
    <div class="operation-list">
      <el-button @click="cobineVideos">合成视频</el-button>
      <el-button @click="cobineAudios">合成音频</el-button>
      <el-button @click="clipVideo">裁剪视频</el-button>
      <el-button @click="clipAudio">裁剪音频</el-button>
      <el-button @click="combineAudioInVideo">合成音视频</el-button>
      <el-button @click="combineImgInVideo">合成图片视频</el-button>
    </div>
    <div class="combine-result">
      <video v-if="combinVideoeUrl" :src="combinVideoeUrl" controls></video>
      <audio v-if="combineAudioUrl" :src="combineAudioUrl" controls></audio>
    </div>
  </div>
</template>

<script type="text/ecmascript-6">
// import Editor from '../fileEditor'
import {
  blobToArrayBuffer
} from '../util'

const { createFFmpeg } = require('@ffmpeg/ffmpeg')

const PATH = 'static/ffmpeg-worker-mp4.js'

export default {
  data () {
    return {
      videoList: [],
      audioList: [],
      imgList: [],
      ffmpeg: null,
      //   editor: new Editor(),
      combinVideoeUrl: '',
      combineAudioUrl: ''
    }
  },
  methods: {
    beforeVideoUpload (file) {
      console.log('video:' + file)
    },
    beforeAudioUpload (file) {
      console.log('audio:' + file)
    },
    beforeImgUpload (file) {
      console.log('img:' + file)
    },
    fileUploadChange (type, file, fileList) {
      console.log(file)
      console.log(fileList)
      switch (type) {
        case 'video':
          this.videoList = fileList
          break
        case 'audio':
          this.audioList = fileList
          break
        case 'img':
          this.imgList = fileList
          break
        default:
          console.log(type)
      }
      this.getArrayBuffer(file, type)
    },
    handleRemove (type) {
      switch (type) {
        case 'video':
          this.videoList = []
          break
        case 'audio':
          this.audioList = []
          break
        case 'img':
          this.imgList = []
          break
        default:
          console.log(type)
      }
    },
    cobineVideos () {},
    cobineAudios () {},
    async clipVideo () {
      const ffmpeg = createFFmpeg({log: true})
      const orginBuffer = await this.getArrayBuffer(this.videoList[0], 'video')
      await ffmpeg.load()
      ffmpeg.FS('writeFile', 'input.mp4', orginBuffer)
      await ffmpeg.run('-ss', '20', '-i', 'input.mp4', '-acodec', 'copy', 'output.mp4')
      const data = ffmpeg.FS('readFile', 'output.mp4')
      this.combinVideoeUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
    //   await this.editor.open({
    //     workerPath: PATH,
    //     mediaType: 'mp4'
    //   })
    //   const originBlob = this.getBlob(this.videoList[0], 'video')
    //   const {blob: clippedBlob} = await this.editor.clip(originBlob, 5)
    //   const url = await this.editor.toUrl(clippedBlob)
    //   const el = this.createElement(url, 'video')
    //   this.combinVideoeUrl = url
    //   console.log(el)
    //   this.editor.close()
    },
    async clipAudio () {
    //   await this.editor.open({
    //     workerPath: PATH,
    //     mediaType: 'mp3'
    //   })
    //   console.log(this.audioList[0])
    //   const originBlob = this.getBlob(this.audioList[0], 'audio')
    //   const {blob: clippedBlob} = await this.editor.clip(originBlob, 15)
    //   const url = await this.editor.toUrl(clippedBlob)
    //   const el = this.createElement(url, 'audio')
    //   this.combineAudioUrl = url
    //   console.log(el)
    //   this.editor.close()
    },
    combineAudioInVideo () {},
    combineImgInVideo () {},
    getBlob (file, type) {
      let mime = type === 'video' ? 'video/mpeg' : type === 'audio' ? 'audio/mpeg' : 'image/jpeg'
      const blob = new Blob([file.raw], {type: mime})
      return blob
    },
    async getArrayBuffer (file, type) {
      let mime = type === 'video' ? 'video/mpeg' : type === 'audio' ? 'audio/mpeg' : 'image/jpeg'
      const blob = new Blob([file.raw], {type: mime})
      const ab = await blobToArrayBuffer(blob)
      return ab
    },
    createElement (url, type) {
      switch (type) {
        case 'video':
          const vel = document.createElement('video')
          vel.src = url
          vel.controls = true
          return vel
        case 'audio':
          const ael = document.createElement('audio')
          ael.src = url
          ael.controls = true
          return ael
        default:
          console.log(type)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.upload-list {
  margin: 40px auto;
  display: flex;
  align-items: center;
  justify-content: space-around;
  .upload-item {
    width: 30%;
    flex-shrink: 0;
  }
}
</style>
