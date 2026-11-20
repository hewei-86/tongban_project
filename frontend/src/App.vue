<script>
export default {
  onLaunch() {
    // 本地数据引擎在首次 import 时自动初始化，这里只做启动记录
    console.log('童伴成长已启动 · 本地数据模式')
  },
  onShow() {
    console.log('童伴成长回到前台')
  }
}
</script>

<style>
/* 全局设计系统：所有页面共用 */
@import './styles/app.css';

page {
  background-color: #fff8f2;
}

button {
  font-size: 28rpx;
}

button::after {
  border: none;
}
</style>
