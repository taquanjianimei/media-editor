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
    <el-button @click="cobine">合成</el-button>
  </div>
</template>

<script type="text/ecmascript-6">
export default {
  data () {
    return {
      videoList: [],
      audioList: [],
      imgList: []
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
    cobine () {
      console.log('合成')
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
