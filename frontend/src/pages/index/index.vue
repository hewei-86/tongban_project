<template>
  <view class="page">
    <view class="blob blob-a"></view>
    <view class="blob blob-b"></view>

    <view class="hero">
      <view class="hero-glow"></view>
      <view class="hero-top">
        <view class="brand-mark">{{ isParent ? '家' : '童' }}</view>
        <view class="hero-copy">
          <text class="eyebrow">MathMagic ✨</text>
          <text class="hello">{{ isParent ? '家长您好' : '今天也要加油呀' }}</text>
          <text class="sub-hello">{{ isParent ? '一起陪伴孩子，慢慢长大' : '欢迎来到今天的学习乐园' }}</text>
        </view>
      </view>
      <view class="hero-actions">
        <picker :range="grades" @change="changeGrade">
          <view class="grade-pill">
            <text class="grade-kicker">当前年级</text>
            <text class="grade-value">{{ grade }}年级</text>
          </view>
        </picker>
        <view class="role-switch" @click="toggleRole">
          <text class="role-kicker">切换视角</text>
          <text class="role-value">{{ isParent ? '家长' : '孩子' }}</text>
        </view>
      </view>
      <view class="stats">
        <view class="stat">
          <text class="stat-icon">⏱</text>
          <text class="stat-num">{{ dashboard.study_minutes || 0 }}</text>
          <text class="stat-label">今日分钟</text>
        </view>
        <view class="stat">
          <text class="stat-icon">★</text>
          <text class="stat-num">{{ dashboard.points || 0 }}</text>
          <text class="stat-label">成长积分</text>
        </view>
        <view class="stat">
          <text class="stat-icon">🔥</text>
          <text class="stat-num">{{ dashboard.streak_days || 0 }}</text>
          <text class="stat-label">连续天数</text>
        </view>
        <view class="stat">
          <text class="stat-icon">Lv</text>
          <text class="stat-num">{{ dashboard.level || 1 }}</text>
          <text class="stat-label">等级</text>
        </view>
      </view>
      <view class="exp-bar-wrap">
        <text class="exp-label">EXP {{ dashboard.exp || 0 }} / {{ dashboard.exp_next || 100 }}</text>
        <view class="exp-bar">
          <view class="exp-fill" :style="{ width: expProgress + '%' }"></view>
        </view>
      </view>
    </view>

    <view class="section-head">
      <view>
        <text class="section-kicker">{{ sectionKicker }}</text>
        <text class="section-title">{{ sectionTitle }}</text>
      </view>
      <view class="refresh-btn" @click="refreshAll">刷新</view>
    </view>

    <!-- ===== 学习中心 ===== -->
    <view v-if="activeTab === 'home'" class="panel">
      <view class="panel-head">
        <text class="panel-title">每日签到</text>
        <text class="panel-tag" :class="{ done: dashboard.checkin_today }">
          {{ dashboard.checkin_today ? '已签到 ✓' : '未签到' }}
        </text>
      </view>
      <view class="checkin-card">
        <view class="streak-display">
          <text class="streak-num">{{ dashboard.streak_days || 0 }}</text>
          <text class="streak-label">连续签到天数</text>
        </view>
        <view class="checkin-btn" :class="{ done: dashboard.checkin_today }" @click="doCheckin">
          <text class="checkin-btn-text">{{ dashboard.checkin_today ? '明天再来' : '立即签到' }}</text>
          <text class="checkin-btn-sub">{{ dashboard.checkin_today ? '' : '+5 ~ +15 积分' }}</text>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'home'" class="panel">
      <view class="panel-head">
        <text class="panel-title">今日学习任务</text>
        <text class="panel-tag">每天一点点</text>
      </view>
      <view v-if="loadingTasks" class="empty">
        <text class="empty-emoji">⏳</text><text>任务加载中…</text>
      </view>
      <view v-else-if="dailyTasks.length === 0" class="empty">
        <text class="empty-emoji">📭</text><text>暂无今日任务</text>
      </view>
      <view v-for="t in dailyTasks" :key="t.id" class="task-row">
        <view class="task-dot" :class="{ done: t.is_completed }">{{ t.is_completed ? '✓' : t.subject === 'math' ? '➗' : t.subject === 'chinese' ? '📖' : '🔤' }}</view>
        <view class="task-info">
          <text class="task-name">{{ t.title }}</text>
          <text class="task-desc">{{ t.description }}</text>
          <view class="mini-progress">
            <view class="mini-bar">
              <view class="mini-fill" :style="{ width: Math.min(100, (t.completed_count / t.target_count) * 100) + '%' }"></view>
            </view>
            <text class="mini-text">{{ t.completed_count }}/{{ t.target_count }}</text>
          </view>
        </view>
        <view class="task-chip" :class="{ done: t.is_completed }" @click="goStudyTask(t)">
          <text>{{ t.is_completed ? '+已领' : '去练习' }}</text>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'home'" class="panel">
      <view class="panel-head">
        <text class="panel-title">学科练习</text>
        <text class="panel-tag">{{ grade }}年级</text>
      </view>
      <view class="subject-grid">
        <view class="subject-card math" @click="openStudy('math')">
          <view class="icon-bubble">➗</view>
          <text class="subject-name">数学乐园</text>
          <text class="subject-desc">口算 · 思维训练</text>
        </view>
        <view class="subject-card chinese" @click="openStudy('chinese')">
          <view class="icon-bubble">📖</view>
          <text class="subject-name">语文天地</text>
          <text class="subject-desc">识字 · 拼音 · 古诗</text>
        </view>
        <view class="subject-card english" @click="openStudy('english')">
          <view class="icon-bubble">🔤</view>
          <text class="subject-name">英语乐园</text>
          <text class="subject-desc">字母 · 单词 · 句子</text>
        </view>
        <view class="subject-card ai" @click="activeTab='ai'">
          <view class="icon-bubble">🤖</view>
          <text class="subject-name">AI 智能老师</text>
          <text class="subject-desc">不会的问题问老师</text>
        </view>
      </view>
    </view>

    <!-- ===== 练习面板 ===== -->
    <view v-if="activeTab === 'study'" class="panel">
      <view class="panel-head">
        <text class="panel-title">{{ subjectTitle }} · 今日练习</text>
        <view class="panel-actions">
          <text class="panel-tag">{{ grade }}年级</text>
          <view class="gen-btn" @click="generatePractice">AI 生成</view>
        </view>
      </view>
      <view v-if="loadingQuestions" class="empty">
        <text class="empty-emoji">✏️</text><text>题目加载中…</text>
      </view>
      <view v-else-if="questions.length === 0" class="empty">
        <text class="empty-emoji">📭</text><text>暂无题目</text>
      </view>
      <view v-for="(q, idx) in questions" :key="q.id" class="question-card">
        <view class="q-badge">第 {{ idx + 1 }} 题</view>
        <text class="question-text">{{ q.content }}</text>
        <view v-if="q.options?.length" class="options">
          <view
            v-for="option in q.options"
            :key="option"
            class="option"
            :class="{ selected: answers[q.id] === option }"
            @click="answers[q.id] = option"
          >
            <view class="option-dot"></view>
            <text class="option-text">{{ option }}</text>
          </view>
        </view>
        <input v-else class="answer-input" v-model="answers[q.id]" placeholder="在这里写下答案" />
        <button class="small-primary" @click="submitAnswer(q)">提交这道题</button>
      </view>
    </view>

    <!-- ===== AI 智能老师 ===== -->
    <view v-if="activeTab === 'ai'" class="panel">
      <view class="panel-head">
        <text class="panel-title">AI 智能老师</text>
        <text class="panel-tag">耐心讲解</text>
      </view>
      <view class="ai-tip">可以问数学、语文、英语。我会用适合小学低年级的方式慢慢讲清楚。</view>
      <view class="quick-questions">
        <view v-for="qp in quickQuestions" :key="qp" class="quick-chip" @click="askQuick(qp)">{{ qp }}</view>
      </view>
      <view class="chat-list">
        <view v-for="(msg, i) in chatMessages" :key="i" class="chat-row" :class="msg.role">
          <view class="chat-avatar">{{ msg.role === 'user' ? '我' : '师' }}</view>
          <view class="chat-bubble">{{ msg.content }}</view>
        </view>
      </view>
      <view class="chat-input-row">
        <input
          class="chat-input"
          v-model="question"
          placeholder="例如：8+7 应该怎么算？"
          confirm-type="send"
          @confirm="sendQuestion"
        />
        <button class="send-btn" :disabled="sending" @click="sendQuestion">{{ sending ? '…' : '发送' }}</button>
      </view>
      <text class="safety-note">AI 可能出错，重要知识请和家长或老师核对。请不要输入真实姓名、住址等隐私信息。</text>
    </view>

    <!-- ===== 错题本 ===== -->
    <view v-if="activeTab === 'wrong'" class="panel">
      <view class="panel-head">
        <text class="panel-title">错题本</text>
        <text class="panel-tag">温故知新</text>
      </view>
      <view class="filter-tabs">
        <view class="filter-tab" :class="{ active: wrongFilter === 'all' }" @click="wrongFilter = 'all'">全部</view>
        <view class="filter-tab" :class="{ active: wrongFilter === 'unmastered' }" @click="wrongFilter = 'unmastered'">待掌握</view>
        <view class="filter-tab" :class="{ active: wrongFilter === 'mastered' }" @click="wrongFilter = 'mastered'">已掌握</view>
      </view>
      <view v-if="loadingWrong" class="empty">
        <text class="empty-emoji">⏳</text><text>加载中…</text>
      </view>
      <view v-else-if="filteredWrong.length === 0" class="empty">
        <text class="empty-emoji">🎉</text><text>太棒了！没有错题</text>
      </view>
      <view v-for="wq in filteredWrong" :key="wq.id" class="wrong-card">
        <view class="wrong-head">
          <view class="q-badge small">{{ subjectLabel(wq.subject) }}</view>
          <view class="wrong-badge" :class="{ mastered: wq.is_mastered }">
            {{ wq.is_mastered ? '✓ 已掌握' : `错 ${wq.wrong_count} 次` }}
          </view>
        </view>
        <text class="question-text">{{ wq.content }}</text>
        <view class="wrong-answer-row">
          <text class="wa-label">你的答案：</text>
          <text class="wa-value wrong">{{ wq.wrong_answer }}</text>
        </view>
        <view class="wrong-answer-row">
          <text class="wa-label">正确答案：</text>
          <text class="wa-value correct">{{ wq.answer }}</text>
        </view>
        <view class="wrong-actions">
          <input v-model="wrongAnswers[wq.id]" class="answer-input small" placeholder="重新作答" />
          <button class="small-primary" @click="retryWrong(wq)">重练</button>
          <view class="mark-mastered" @click="markMastered(wq)">标记掌握</view>
        </view>
      </view>
    </view>

    <!-- ===== 亲子互评 ===== -->
    <view v-if="activeTab === 'family'" class="panel">
      <view class="panel-head">
        <text class="panel-title">亲子成长互评</text>
        <text class="panel-tag">互相理解</text>
      </view>
      <view class="harmony-card" v-if="harmony">
        <text class="harmony-title">亲子默契度</text>
        <view class="harmony-score-wrap">
          <view class="harmony-circle">
            <text class="harmony-num">{{ harmony.harmony_score || 0 }}</text>
          </view>
          <view class="harmony-info">
            <view class="harmony-item"><text>家长评孩子</text><text>{{ harmony.avg_scores.parent_to_child || 0 }} / 5</text></view>
            <view class="harmony-item"><text>孩子评家长</text><text>{{ harmony.avg_scores.child_to_parent || 0 }} / 5</text></view>
            <view class="harmony-item"><text>互评总数</text><text>{{ harmony.count || 0 }} 条</text></view>
          </view>
        </view>
      </view>
      <view class="ai-tip">家长和孩子分别说说感受。这里不排名，也不用来惩罚。</view>

      <view class="form-label">评价对象</view>
      <picker :range="targetOptions" @change="targetIndex = Number($event.detail.value)">
        <view class="picker-box">
          <text>{{ targetOptions[targetIndex] }}</text>
          <text class="picker-arrow">选择</text>
        </view>
      </picker>

      <view class="form-label">评价项目</view>
      <picker :range="evaluationItems" @change="itemIndex = Number($event.detail.value)">
        <view class="picker-box">
          <text>{{ evaluationItems[itemIndex] }}</text>
          <text class="picker-arrow">选择</text>
        </view>
      </picker>

      <view class="form-label">给几颗星</view>
      <view class="star-card">
        <view class="stars">
          <text v-for="n in 5" :key="n" @click="score = n" :class="{ active: n <= score }">★</text>
        </view>
        <text class="star-caption">{{ scoreLabel }}</text>
      </view>

      <view class="form-label">想说的话（选填）</view>
      <textarea class="comment-box" v-model="comment" placeholder="写一句鼓励，或者一个小小的建议…" maxlength="200" />
      <button class="primary-btn" @click="submitEvaluation">提交评价</button>
      <view v-if="evaluationMessage" class="result-note">{{ evaluationMessage }}</view>

      <view class="form-label">近期互评记录</view>
      <view v-if="recentEvals.length === 0" class="empty"><text>还没有互评记录</text></view>
      <view v-for="ev in recentEvals" :key="ev.id" class="eval-row">
        <view class="eval-direction">{{ ev.direction === 'parent_to_child' ? '👨‍👧 家长 → 孩子' : '👧 孩子 → 家长' }}</view>
        <text class="eval-item">{{ ev.item }}</text>
        <view class="eval-stars">
          <text v-for="n in 5" :key="n" :class="{ active: n <= ev.score }">★</text>
        </view>
        <text class="eval-comment" v-if="ev.comment">"{{ ev.comment }}"</text>
        <text class="eval-time">{{ ev.created_at }}</text>
      </view>
    </view>

    <!-- ===== 成长体系 ===== -->
    <view v-if="activeTab === 'growth'" class="panel">
      <view class="panel-head">
        <text class="panel-title">我的成长</text>
        <text class="panel-tag">等级 {{ growth.level || 1 }}</text>
      </view>
      <view class="growth-hero">
        <view class="level-circle">
          <text class="level-num">{{ growth.level || 1 }}</text>
          <text class="level-label">等级</text>
        </view>
        <view class="growth-info">
          <text class="growth-exp">EXP {{ growth.exp || 0 }} / {{ growth.exp_next || 100 }}</text>
          <view class="exp-bar big">
            <view class="exp-fill" :style="{ width: growth.progress_pct || 0 + '%' }"></view>
          </view>
          <view class="growth-stats-row">
            <view class="growth-mini-stat"><text class="gms-num">{{ growth.points || 0 }}</text><text class="gms-label">积分</text></view>
            <view class="growth-mini-stat"><text class="gms-num">{{ growth.total_minutes || 0 }}</text><text class="gms-label">总学习</text></view>
            <view class="growth-mini-stat"><text class="gms-num">{{ growth.streak_days || 0 }}</text><text class="gms-label">连续天</text></view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'growth'" class="panel">
      <view class="panel-head">
        <text class="panel-title">勋章 & 成就</text>
        <text class="panel-tag">{{ unlockedCount }} / {{ achievements.length }}</text>
      </view>
      <view class="achievements-grid">
        <view v-for="a in achievements" :key="a.id" class="ach-card" :class="{ locked: !a.unlocked }">
          <view class="ach-icon">{{ a.unlocked ? a.icon : '🔒' }}</view>
          <text class="ach-name">{{ a.name }}</text>
          <text class="ach-desc">{{ a.description }}</text>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'growth'" class="panel">
      <view class="panel-head">
        <text class="panel-title">家庭排行榜</text>
        <text class="panel-tag">Family</text>
      </view>
      <view v-if="leaderboard.length === 0" class="empty"><text>暂无排行数据</text></view>
      <view v-for="p in leaderboard" :key="p.user_id" class="rank-row" :class="{ me: p.user_id === userId }">
        <view class="rank-num" :class="'r' + p.rank">{{ p.rank }}</view>
        <view class="rank-info">
          <text class="rank-name">{{ p.username }} {{ p.role === 'parent' ? '(家长)' : '' }}</text>
          <text class="rank-sub">Lv.{{ p.level }} · {{ p.points }} 积分</text>
        </view>
        <view class="rank-mini-stat">{{ p.total_minutes }} 分钟</view>
      </view>
    </view>

    <view v-if="activeTab === 'growth'" class="panel">
      <view class="panel-head">
        <text class="panel-title">成长曲线</text>
        <text class="panel-tag">近 14 天</text>
      </view>
      <view class="curve-wrap">
        <view class="curve-chart">
          <view v-for="(d, i) in growthCurve" :key="i" class="curve-bar-col">
            <view class="curve-bar" :style="{ height: barHeight(d.study_minutes) + '%' }"></view>
            <text class="curve-label">{{ d.date.slice(8) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 家长中心 ===== -->
    <view v-if="activeTab === 'parent'" class="panel">
      <view class="panel-head">
        <text class="panel-title">孩子学习概况</text>
        <text class="panel-tag">家长视角</text>
      </view>
      <view v-if="parentDashboard.children?.length" v-for="child in parentDashboard.children" :key="child.user_id" class="child-card">
        <view class="child-head">
          <text class="child-name">{{ child.username }}</text>
          <view class="child-badges">
            <text class="child-badge">Lv.{{ child.level }}</text>
            <text class="child-badge">🔥 {{ child.streak_days }}天</text>
          </view>
        </view>
        <view class="child-stats">
          <view class="child-stat">
            <text class="cs-num">{{ child.today_minutes }}</text><text class="cs-label">今日分钟</text>
          </view>
          <view class="child-stat">
            <text class="cs-num">{{ child.today_correct }}/{{ child.today_total }}</text><text class="cs-label">今日练习</text>
          </view>
          <view class="child-stat">
            <text class="cs-num">{{ child.accuracy_week }}%</text><text class="cs-label">本周正确率</text>
          </view>
          <view class="child-stat">
            <text class="cs-num">{{ child.wrong_count }}</text><text class="cs-label">待掌握错题</text>
          </view>
        </view>
        <view class="week-minutes">
          <text class="wm-label">本周学习 {{ child.week_minutes }} 分钟</text>
          <view class="bar"><view class="bar-fill" :style="{ width: Math.min(100, child.week_minutes * 2) + '%' }"></view></view>
        </view>
      </view>
      <view v-else class="empty"><text>暂无孩子数据</text></view>
    </view>

    <view v-if="activeTab === 'parent'" class="panel">
      <view class="panel-head">
        <text class="panel-title">学习目标设置</text>
        <text class="panel-tag">支持与鼓励</text>
      </view>
      <view v-for="g in parentDashboard.active_goals || []" :key="g.id" class="goal-row">
        <view class="goal-dot">🎯</view>
        <view class="goal-info">
          <text class="goal-title">{{ g.title }}</text>
          <text class="goal-sub">每日 {{ g.target_minutes }} 分钟 · 截止 {{ g.target_date }}</text>
        </view>
      </view>
      <view class="new-goal">
        <input class="answer-input" v-model="newGoal.title" placeholder="目标名称，如：每天坚持口算练习" />
        <view class="goal-minutes-row">
          <text class="gml-label">每日目标分钟：</text>
          <input class="mini-input" type="number" v-model.number="newGoal.minutes" />
        </view>
        <picker mode="date" :value="newGoal.date" @change="newGoal.date = $event.detail.value">
          <view class="picker-box">
            <text>截止日期：{{ newGoal.date || '请选择' }}</text>
            <text class="picker-arrow">选择</text>
          </view>
        </picker>
        <button class="primary-btn" @click="createGoal">设置目标</button>
      </view>
    </view>

    <view v-if="activeTab === 'parent'" class="panel">
      <view class="panel-head">
        <text class="panel-title">学习时长管理</text>
        <text class="panel-tag">保护视力</text>
      </view>
      <view v-for="tl in parentDashboard.time_limits || []" :key="tl.user_id" class="limit-card">
        <text class="limit-title">每日限制 {{ tl.daily_limit_minutes }} 分钟</text>
        <view class="limit-row">
          <text class="limit-label">提醒阈值</text>
          <text class="limit-value">{{ tl.warning_minutes }} 分钟</text>
        </view>
        <view class="limit-btns">
          <view class="limit-btn" @click="setTimeLimit(tl.user_id, tl.daily_limit_minutes - 10, tl.warning_minutes - 10)">-10 分钟</view>
          <view class="limit-btn primary" @click="setTimeLimit(tl.user_id, tl.daily_limit_minutes + 10, tl.warning_minutes + 10)">+10 分钟</view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'parent'" class="panel">
      <view class="panel-head">
        <text class="panel-title">学习报告</text>
        <text class="panel-tag">只看变化</text>
      </view>
      <view class="tabs-row">
        <view class="mini-tab" :class="{ active: reportPeriod === 'week' }" @click="reportPeriod = 'week'; loadReport()">周报</view>
        <view class="mini-tab" :class="{ active: reportPeriod === 'month' }" @click="reportPeriod = 'month'; loadReport()">月报</view>
      </view>
      <view v-if="reportPeriod === 'week'">
        <view class="report-hero">
          <text class="report-number">{{ report.total_records || 0 }}</text>
          <text class="report-label">本周练习次数</text>
        </view>
        <view class="metric">
          <view class="metric-row"><text>学习时长</text><text class="metric-value">{{ report.total_minutes || 0 }} 分钟</text></view>
        </view>
        <view class="metric">
          <view class="metric-row"><text>正确率</text><text class="metric-value">{{ report.accuracy || 0 }}%</text></view>
          <view class="bar"><view class="bar-fill" :style="{ width: accuracyWidth }"></view></view>
        </view>
        <view class="metric">
          <view class="metric-row"><text>亲子评价</text><text class="metric-value">{{ report.evaluation_count || 0 }} 条</text></view>
        </view>
      </view>
      <view v-else>
        <view class="report-hero">
          <text class="report-number">{{ monthlyReport.total_count || 0 }}</text>
          <text class="report-label">本月练习次数</text>
        </view>
        <view class="metric">
          <view class="metric-row"><text>学习时长</text><text class="metric-value">{{ monthlyReport.total_minutes || 0 }} 分钟</text></view>
        </view>
        <view class="metric">
          <view class="metric-row"><text>正确率</text><text class="metric-value">{{ monthlyReport.accuracy || 0 }}%</text></view>
          <view class="bar"><view class="bar-fill" :style="{ width: monthlyAccuracyWidth }"></view></view>
        </view>
        <view class="metric">
          <view class="metric-row"><text>签到次数</text><text class="metric-value">{{ monthlyReport.checkin_count || 0 }} 次</text></view>
        </view>
        <view class="metric">
          <view class="metric-row"><text>亲子评价</text><text class="metric-value">{{ monthlyReport.evaluation_count || 0 }} 条</text></view>
        </view>
      </view>
      <text class="safety-note">报告用来观察成长变化，不给孩子贴标签，也不和其他孩子比较。</text>
    </view>

    <view class="tabbar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <text class="tab-icon">{{ tab.icon }}</text>
        <text class="tab-name">{{ tab.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { request } from '../../../api/index.js'

const activeTab = ref('home')
const isParent = ref(false)
const userId = ref(2)
const familyId = 1
const grade = ref(1)
const grades = ['一年级', '二年级', '三年级']

const tabs = computed(() => {
  if (isParent.value) {
    return [
      { key: 'parent', name: '家长中心', icon: '👨‍👩‍👧' },
      { key: 'family', name: '亲子互评', icon: '💗' },
      { key: 'growth', name: '成长体系', icon: '🏆' },
    ]
  }
  return [
    { key: 'home', name: '学习中心', icon: '🏠' },
    { key: 'study', name: '练习', icon: '✏️' },
    { key: 'ai', name: 'AI老师', icon: '🤖' },
    { key: 'wrong', name: '错题本', icon: '📖' },
    { key: 'family', name: '亲子', icon: '💗' },
    { key: 'growth', name: '成长', icon: '🏆' },
  ]
})

const sectionKicker = computed(() => isParent.value ? '家长工作台' : '今日学习')
const sectionTitle = computed(() => isParent.value ? '一起陪伴孩子成长' : '今天学点什么好呢？')

const dashboard = ref({})
const report = ref({})
const monthlyReport = ref({})
const reportPeriod = ref('week')
const parentDashboard = ref({ children: [], active_goals: [], time_limits: [] })
const questions = ref([])
const answers = ref({})
const loadingQuestions = ref(false)
const subject = ref('math')
const subjectTitle = computed(() => ({ math: '数学', chinese: '语文', english: '英语' }[subject.value]))

const dailyTasks = ref([])
const loadingTasks = ref(false)

const growth = ref({})
const achievements = ref([])
const leaderboard = ref([])
const growthCurve = ref([])
const unlockedCount = computed(() => achievements.value.filter(a => a.unlocked).length)

const wrongBook = ref([])
const wrongAnswers = ref({})
const loadingWrong = ref(false)
const wrongFilter = ref('all')
const filteredWrong = computed(() => {
  if (wrongFilter.value === 'all') return wrongBook.value
  if (wrongFilter.value === 'unmastered') return wrongBook.value.filter(w => !w.is_mastered)
  return wrongBook.value.filter(w => w.is_mastered)
})

const harmony = ref(null)
const recentEvals = ref([])

const expProgress = computed(() => {
  const cur = dashboard.value.exp || 0
  const next = dashboard.value.exp_next || 100
  return Math.min(100, (cur / next) * 100)
})
const accuracyWidth = computed(() => `${Math.min(100, Number(report.value.accuracy) || 0)}%`)
const monthlyAccuracyWidth = computed(() => `${Math.min(100, Number(monthlyReport.value.accuracy) || 0)}%`)

const question = ref('')
const sending = ref(false)
const chatMessages = ref([{ role: 'assistant', content: '你好呀！我是 MathMagic 的 AI 学习助手 🎩✨ 今天想学点什么？可以直接问我哦～' }])
const quickQuestions = ['9+8 怎么算？', '"日"加一笔变什么字？', '苹果的英文是什么？']

const targetOptions = computed(() => isParent.value ? ['孩子'] : ['家长'])
const targetIndex = ref(0)
const evaluationItems = computed(() => isParent.value
  ? ['学习主动性', '作业完成情况', '生活自理', '礼貌与习惯', '情绪表达']
  : ['陪伴时间', '耐心倾听', '鼓励表扬', '共同活动', '遵守约定'])
const itemIndex = ref(0)
const score = ref(5)
const scoreLabels = ['', '再接再厉', '有进步', '做得很好', '非常棒', '超级赞']
const scoreLabel = computed(() => scoreLabels[score.value] || '')
const comment = ref('')
const evaluationMessage = ref('')

const newGoal = ref({ title: '', minutes: 30, date: '' })

function barHeight(v) {
  const max = Math.max(10, ...growthCurve.value.map(d => d.study_minutes))
  return (v / max) * 100
}
function subjectLabel(s) {
  return ({ math: '数学', chinese: '语文', english: '英语' })[s] || s
}

function switchTab(key) { activeTab.value = key; onTabSwitch(key) }
function toggleRole() {
  isParent.value = !isParent.value
  userId.value = isParent.value ? 1 : 2
  activeTab.value = isParent.value ? 'parent' : 'home'
  refreshAll()
}
function changeGrade(e) { grade.value = Number(e.detail.value) + 1; if (activeTab.value === 'study') loadQuestions() }

async function onTabSwitch(key) {
  if (key === 'home') { loadDashboard(); loadTasks() }
  if (key === 'study') await loadQuestions()
  if (key === 'wrong') loadWrongBook()
  if (key === 'family') { loadHarmony(); loadRecentEvals() }
  if (key === 'growth') { loadGrowth(); loadAchievements(); loadLeaderboard(); loadGrowthCurve() }
  if (key === 'parent') loadParentDashboard()
}

async function refreshAll() {
  loadDashboard()
  if (isParent.value) loadParentDashboard()
  else { loadTasks(); loadGrowth(); loadAchievements(); loadWrongBook() }
  loadReport()
}

async function loadDashboard() {
  try { dashboard.value = await request(`/api/dashboard?user_id=${userId.value}`) }
  catch (e) { uni.showToast({ title: '连接后端失败', icon: 'none' }) }
}

async function loadTasks() {
  loadingTasks.value = true
  try { dailyTasks.value = (await request(`/api/tasks/daily?user_id=${userId.value}`)) || [] }
  catch (e) { }
  finally { loadingTasks.value = false }
}

async function loadQuestions() {
  loadingQuestions.value = true
  try {
    questions.value = (await request(`/api/questions?subject=${subject.value}&grade=${grade.value}`)) || []
    answers.value = {}
  } catch (e) { uni.showToast({ title: '题目加载失败', icon: 'none' }) }
  finally { loadingQuestions.value = false }
}

async function generatePractice() {
  loadingQuestions.value = true
  try {
    const res = await request('/api/practice/generate', 'POST', {
      user_id: userId.value, subject: subject.value, grade: grade.value, count: 5
    })
    questions.value = (res && res.questions) || []
    answers.value = {}
    uni.showToast({ title: res.demo ? '已从题库随机抽取' : 'AI 生成完成', icon: 'none' })
  } catch (e) { uni.showToast({ title: '生成失败', icon: 'none' }) }
  finally { loadingQuestions.value = false }
}

async function openStudy(name) { subject.value = name; activeTab.value = 'study'; await loadQuestions() }
function goStudyTask(t) { subject.value = t.subject; activeTab.value = 'study'; loadQuestions() }

async function submitAnswer(q) {
  const answer = String(answers.value[q.id] ?? '').trim()
  if (!answer) { uni.showToast({ title: '请先填写答案', icon: 'none' }); return }
  try {
    const result = await request('/api/learning/submit', 'POST', { user_id: userId.value, question_id: q.id, answer })
    uni.showModal({
      title: result.is_correct ? '答对啦！🎉' : '再想一想',
      content: result.explanation + (result.new_achievements?.length ? '\n\n🏅 解锁成就：' + result.new_achievements.map(a => a.name).join('、') : ''),
      showCancel: false
    })
    await loadDashboard()
    loadTasks()
  } catch (e) { uni.showToast({ title: e.message || '提交失败', icon: 'none' }) }
}

async function doCheckin() {
  if (dashboard.value.checkin_today) { uni.showToast({ title: '今天已经签过啦', icon: 'none' }); return }
  try {
    const res = await request('/api/checkin', 'POST', { user_id: userId.value })
    if (res.ok) {
      uni.showToast({ title: res.message, icon: 'none' })
      if (res.new_achievements?.length) {
        setTimeout(() => {
          uni.showModal({
            title: '🏅 解锁新成就！',
            content: res.new_achievements.map(a => `${a.icon} ${a.name}`).join('\n'),
            showCancel: false
          })
        }, 800)
      }
      await loadDashboard()
    } else {
      uni.showToast({ title: res.message, icon: 'none' })
    }
  } catch (e) { uni.showToast({ title: '签到失败', icon: 'none' }) }
}

async function sendQuestion() {
  const text = question.value.trim()
  if (!text || sending.value) return
  chatMessages.value.push({ role: 'user', content: text })
  question.value = ''
  sending.value = true
  try {
    const result = await request('/api/ai/chat', 'POST', { user_id: userId.value, grade: grade.value, question: text })
    chatMessages.value.push({ role: 'assistant', content: result.answer + (result.demo ? '\n（当前为演示回复，配置 Qwen Key 后启用真实 AI）' : '') })
  } catch (e) {
    chatMessages.value.push({ role: 'assistant', content: '暂时无法连接老师，请检查后端服务是否启动。' })
  } finally { sending.value = false }
}
function askQuick(q) { question.value = q; sendQuestion() }

async function loadWrongBook() {
  loadingWrong.value = true
  try { wrongBook.value = (await request(`/api/wrong-book?user_id=${userId.value}`)) || [] }
  catch (e) { }
  finally { loadingWrong.value = false }
}
async function retryWrong(wq) {
  const answer = String(wrongAnswers.value[wq.id] ?? '').trim()
  if (!answer) { uni.showToast({ title: '请先作答', icon: 'none' }); return }
  try {
    const result = await request(`/api/wrong-book/retry/${wq.id}`, 'POST', { user_id: userId.value, question_id: wq.question_id, answer })
    uni.showModal({ title: result.is_correct ? '答对啦！🎉' : '再想想～', content: result.explanation, showCancel: false })
    wrongAnswers.value[wq.id] = ''
    loadWrongBook()
  } catch (e) { uni.showToast({ title: '提交失败', icon: 'none' }) }
}
async function markMastered(wq) {
  try {
    const res = await request(`/api/wrong-book/master/${wq.id}`, 'POST', {})
    uni.showToast({ title: res.message, icon: 'none' })
    loadWrongBook()
  } catch (e) { }
}

async function submitEvaluation() {
  try {
    const res = await request('/api/evaluations', 'POST', {
      family_id: familyId, evaluator_id: userId.value,
      target_id: isParent.value ? 2 : 1,
      direction: isParent.value ? 'parent_to_child' : 'child_to_parent',
      item: evaluationItems.value[itemIndex.value],
      score: score.value, comment: comment.value
    })
    evaluationMessage.value = '评价提交成功！谢谢你认真表达自己的感受。'
    comment.value = ''
    loadHarmony(); loadRecentEvals()
  } catch (e) { evaluationMessage.value = e.message || '提交失败，请检查后端。' }
}
async function loadHarmony() { try { harmony.value = (await request(`/api/family/harmony?family_id=${familyId}`)) || {} } catch (e) { } }
async function loadRecentEvals() { try { recentEvals.value = (await request(`/api/evaluations/list?family_id=${familyId}`)) || [] } catch (e) { } }

async function loadGrowth() { try { growth.value = (await request(`/api/growth?user_id=${userId.value}`)) || {} } catch (e) { } }
async function loadAchievements() { try { achievements.value = (await request(`/api/achievements?user_id=${userId.value}`)) || [] } catch (e) { } }
async function loadLeaderboard() { try { leaderboard.value = (await request(`/api/leaderboard?family_id=${familyId}`)) || [] } catch (e) { } }
async function loadGrowthCurve() { try { growthCurve.value = (await request(`/api/growth-curve?user_id=${userId.value}&days=14`)) || [] } catch (e) { } }

async function loadParentDashboard() { try { parentDashboard.value = (await request(`/api/parent/dashboard?family_id=${familyId}`)) || { children: [], active_goals: [], time_limits: [] } } catch (e) { uni.showToast({ title: '家长数据加载失败', icon: 'none' }) } }
async function createGoal() {
  if (!newGoal.value.title) { uni.showToast({ title: '请填写目标名称', icon: 'none' }); return }
  if (!newGoal.value.date) { uni.showToast({ title: '请选择截止日期', icon: 'none' }); return }
  try {
    const childId = 2
    const res = await request('/api/goals', 'POST', {
      family_id: familyId, child_user_id: childId, parent_user_id: userId.value,
      title: newGoal.value.title, target_minutes: newGoal.value.minutes, target_date: newGoal.value.date,
    })
    uni.showToast({ title: res.message, icon: 'none' })
    newGoal.value = { title: '', minutes: 30, date: '' }
    loadParentDashboard()
  } catch (e) { uni.showToast({ title: '设置失败', icon: 'none' }) }
}
async function setTimeLimit(childId, daily, warning) {
  try {
    await request('/api/time-limit', 'POST', { child_user_id: childId, daily_limit_minutes: Math.max(10, daily), warning_minutes: Math.max(5, warning) })
    uni.showToast({ title: '学习时长已更新', icon: 'none' })
    loadParentDashboard()
  } catch (e) { }
}

async function loadReport() {
  try {
    if (reportPeriod.value === 'week') report.value = (await request(`/api/reports/weekly?family_id=${familyId}`)) || {}
    else monthlyReport.value = (await request(`/api/reports/monthly?family_id=${familyId}`)) || {}
  } catch (e) { }
}

onMounted(() => { refreshAll() })
</script>

<style scoped>
.page {
  position: relative; max-width: 480px; margin: 0 auto; min-height: 100vh;
  padding: 20rpx 28rpx 240rpx; overflow: hidden; box-sizing: border-box;
}
.blob { position: absolute; border-radius: 50%; z-index: 0; pointer-events: none; }
.blob-a { width: 280rpx; height: 280rpx; right: -90rpx; top: 520rpx; background: rgba(255, 186, 140, 0.35); }
.blob-b { width: 220rpx; height: 220rpx; left: -80rpx; top: 980rpx; background: rgba(255, 214, 168, 0.45); }
.hero, .section-head, .subject-grid, .panel, .tabbar { position: relative; z-index: 1; }
.hero { overflow: hidden; border-radius: 40rpx; padding: 28rpx 28rpx 22rpx; color: #fff;
  background: linear-gradient(155deg, #ffb067 0%, #ff7a4d 46%, #ff5f86 100%);
  box-shadow: 0 22rpx 48rpx rgba(255, 112, 78, 0.28); }
.hero-glow { position: absolute; width: 260rpx; height: 260rpx; right: -70rpx; top: -90rpx; border-radius: 50%; background: rgba(255,255,255,0.18); }
.hero-top { display: flex; align-items: center; gap: 20rpx; }
.brand-mark { width: 88rpx; height: 88rpx; border-radius: 28rpx; background: rgba(255,255,255,0.22); border: 2rpx solid rgba(255,255,255,0.35); text-align: center; line-height: 88rpx; font-size: 36rpx; font-weight: 700; flex-shrink: 0; }
.hero-copy { display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.eyebrow { font-size: 20rpx; letter-spacing: 4rpx; opacity: 0.85; }
.hello { font-size: 40rpx; font-weight: 700; line-height: 1.25; }
.sub-hello { font-size: 24rpx; opacity: 0.92; line-height: 1.4; }
.hero-actions { display: flex; gap: 16rpx; margin-top: 28rpx; }
.grade-pill, .role-switch { background: rgba(255,255,255,0.18); border: 2rpx solid rgba(255,255,255,0.32); border-radius: 24rpx; padding: 14rpx 22rpx; display: flex; flex-direction: column; gap: 4rpx; }
.grade-kicker, .role-kicker { font-size: 20rpx; opacity: 0.85; }
.grade-value, .role-value { font-size: 28rpx; font-weight: 700; }
.stats { display: flex; gap: 10rpx; margin-top: 20rpx; }
.stat { flex: 1; background: rgba(255,255,255,0.18); border-radius: 24rpx; padding: 12rpx 8rpx; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.stat-icon { font-size: 24rpx; }
.stat-num { font-size: 34rpx; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 20rpx; opacity: 0.9; }
.exp-bar-wrap { margin-top: 14rpx; }
.exp-label { font-size: 20rpx; opacity: 0.9; display: block; text-align: right; margin-bottom: 6rpx; }
.exp-bar { height: 12rpx; background: rgba(255,255,255,0.25); border-radius: 999rpx; overflow: hidden; }
.exp-fill { height: 100%; border-radius: 999rpx; background: linear-gradient(90deg, #fff, #ffe6cc); }

.section-head { display: flex; justify-content: space-between; align-items: flex-end; margin: 26rpx 6rpx 16rpx; }
.section-kicker { display: block; color: #c47a4a; font-size: 22rpx; font-weight: 600; margin-bottom: 6rpx; }
.section-title { display: block; font-size: 36rpx; font-weight: 700; color: #2c241c; }
.refresh-btn { background: #fff; color: #e06a3a; font-size: 24rpx; font-weight: 600; padding: 12rpx 24rpx; border-radius: 999rpx; box-shadow: 0 8rpx 20rpx rgba(120,70,30,0.06); }

.subject-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; }
.subject-card { background: #fff; border-radius: 30rpx; padding: 26rpx 24rpx 24rpx; min-height: 176rpx; display: flex; flex-direction: column; gap: 10rpx; box-shadow: 0 12rpx 28rpx rgba(90,50,20,0.06); }
.subject-card:active { transform: scale(0.98); }
.icon-bubble { width: 72rpx; height: 72rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-bottom: 6rpx; }
.math .icon-bubble { background: #fff1df; } .chinese .icon-bubble { background: #e7f7ef; }
.english .icon-bubble { background: #e8f1ff; } .ai .icon-bubble { background: #f3eaff; }
.subject-name { font-size: 30rpx; font-weight: 700; color: #2c241c; }
.subject-desc { font-size: 22rpx; color: #8d8074; }

.panel { background: #fff; border-radius: 32rpx; padding: 28rpx 26rpx 18rpx; margin-top: 22rpx; box-shadow: 0 14rpx 36rpx rgba(90,50,20,0.06); }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.panel-title { font-size: 32rpx; font-weight: 700; color: #2c241c; }
.panel-tag { font-size: 22rpx; color: #c47a4a; background: #fff4ea; padding: 8rpx 16rpx; border-radius: 999rpx; }
.panel-tag.done { color: #1f9d68; background: #e7f7ef; }
.panel-actions { display: flex; align-items: center; gap: 12rpx; }
.gen-btn { background: #fff1df; color: #d26532; font-size: 22rpx; padding: 8rpx 16rpx; border-radius: 999rpx; }

.checkin-card { display: flex; align-items: center; justify-content: space-between; margin-top: 18rpx; background: linear-gradient(135deg, #fff8f1, #ffece0); border-radius: 24rpx; padding: 28rpx; }
.streak-display { display: flex; flex-direction: column; }
.streak-num { font-size: 64rpx; font-weight: 700; color: #e06a3a; line-height: 1; }
.streak-label { font-size: 24rpx; color: #8d8074; margin-top: 8rpx; }
.checkin-btn { background: linear-gradient(135deg, #ff9460, #ff6a45); padding: 20rpx 32rpx; border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.checkin-btn.done { background: #e7f7ef; }
.checkin-btn-text { color: #fff; font-weight: 700; font-size: 28rpx; }
.checkin-btn.done .checkin-btn-text { color: #1f9d68; }
.checkin-btn-sub { color: rgba(255,255,255,0.85); font-size: 20rpx; }
.checkin-btn.done .checkin-btn-sub { color: #1f9d68; opacity: 0.7; }

.task-row { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f4ece4; }
.task-row:last-child { border: 0; }
.task-dot { width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; background: #fff4df; color: #e09a2b; border-radius: 18rpx; margin-right: 18rpx; font-size: 26rpx; flex-shrink: 0; }
.task-dot.done { background: #e7f7ef; color: #1f9d68; }
.task-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.task-name { font-size: 28rpx; font-weight: 600; color: #2c241c; }
.task-desc { font-size: 22rpx; color: #9a8d82; }
.mini-progress { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.mini-bar { flex: 1; height: 10rpx; background: #f4ece4; border-radius: 999rpx; overflow: hidden; }
.mini-fill { height: 100%; background: linear-gradient(90deg, #ffb067, #ff6a45); border-radius: 999rpx; }
.mini-text { font-size: 20rpx; color: #8d8074; flex-shrink: 0; }
.task-chip { font-size: 22rpx; color: #fff; background: #ff7a4d; padding: 12rpx 20rpx; border-radius: 999rpx; margin-left: 12rpx; flex-shrink: 0; }
.task-chip.done { background: #1f9d68; }

.question-card { padding: 26rpx 0 22rpx; border-bottom: 1rpx solid #f4ece4; display: flex; flex-direction: column; gap: 18rpx; }
.question-card:last-child { border: 0; }
.q-badge { align-self: flex-start; background: #fff4ea; color: #d26532; font-size: 22rpx; font-weight: 600; padding: 6rpx 16rpx; border-radius: 999rpx; }
.q-badge.small { padding: 4rpx 12rpx; font-size: 20rpx; }
.question-text { font-size: 32rpx; font-weight: 700; color: #2c241c; line-height: 1.45; }
.options { display: flex; flex-direction: column; gap: 14rpx; }
.option { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 22rpx; border-radius: 20rpx; background: #faf6f2; border: 2rpx solid transparent; }
.option-dot { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid #d8cdc3; flex-shrink: 0; box-sizing: border-box; }
.option-text { font-size: 28rpx; color: #3d342c; }
.option.selected { background: #fff1e8; border-color: #ffb089; }
.option.selected .option-dot { border-color: #ff7a4d; background: #ff7a4d; box-shadow: inset 0 0 0 5rpx #fff; }
.answer-input, .chat-input, .picker-box, .comment-box { background: #faf6f2; border-radius: 20rpx; padding: 20rpx 22rpx; font-size: 28rpx; color: #2c241c; }
.answer-input.small { padding: 14rpx 18rpx; font-size: 26rpx; flex: 1; }
.small-primary, .primary-btn, .send-btn { background: linear-gradient(135deg, #ff9460, #ff6a45); color: #fff; border-radius: 999rpx; font-weight: 650; border: 0; line-height: 1; }
.small-primary { align-self: flex-end; width: 240rpx; margin: 0; font-size: 26rpx; padding: 20rpx 0; }
.primary-btn { margin: 24rpx 0 8rpx; padding: 24rpx 0; font-size: 30rpx; }
.send-btn { width: 128rpx; margin: 0; font-size: 26rpx; padding: 18rpx 0; }
.small-primary::after, .primary-btn::after, .send-btn::after { border: none; }
.send-btn[disabled] { opacity: 0.6; }

.ai-tip { background: #fff6ee; color: #8a6248; padding: 20rpx 22rpx; border-radius: 20rpx; margin: 18rpx 0 8rpx; line-height: 1.6; font-size: 24rpx; }
.quick-questions { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 18rpx; }
.quick-chip { background: #fff1df; color: #d26532; font-size: 22rpx; padding: 10rpx 18rpx; border-radius: 999rpx; }
.chat-list { max-height: 560rpx; overflow-y: auto; padding: 8rpx 0 4rpx; }
.chat-row { display: flex; align-items: flex-end; gap: 12rpx; margin: 16rpx 0; }
.chat-row.user { flex-direction: row-reverse; }
.chat-avatar { width: 56rpx; height: 56rpx; border-radius: 18rpx; background: #ffe8d4; color: #e06a3a; text-align: center; line-height: 56rpx; font-size: 24rpx; font-weight: 700; flex-shrink: 0; }
.chat-row.user .chat-avatar { background: #ffe1ea; color: #e25b7a; }
.chat-bubble { max-width: 78%; padding: 18rpx 22rpx; border-radius: 24rpx; white-space: pre-wrap; line-height: 1.6; font-size: 26rpx; }
.chat-row.assistant .chat-bubble { background: #faf6f2; color: #3d342c; border-bottom-left-radius: 8rpx; }
.chat-row.user .chat-bubble { background: #ff7a4d; color: #fff; border-bottom-right-radius: 8rpx; }
.chat-input-row { display: flex; gap: 12rpx; align-items: center; margin-top: 16rpx; background: #faf6f2; border-radius: 999rpx; padding: 8rpx 8rpx 8rpx 22rpx; }
.chat-input { flex: 1; min-width: 0; background: transparent; padding: 12rpx 0; }
.safety-note { display: block; color: #a8988c; font-size: 22rpx; line-height: 1.55; margin: 18rpx 4rpx 10rpx; }

.filter-tabs { display: flex; gap: 14rpx; margin-bottom: 16rpx; }
.filter-tab { flex: 1; text-align: center; padding: 14rpx 0; border-radius: 999rpx; background: #f4ece4; color: #8d8074; font-size: 26rpx; font-weight: 600; }
.filter-tab.active { background: linear-gradient(135deg, #ff9460, #ff6a45); color: #fff; }
.wrong-card { padding: 24rpx 0; border-bottom: 1rpx solid #f4ece4; }
.wrong-card:last-child { border: 0; }
.wrong-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.wrong-badge { font-size: 22rpx; color: #e25b3a; background: #ffe0d4; padding: 6rpx 14rpx; border-radius: 999rpx; }
.wrong-badge.mastered { color: #1f9d68; background: #e7f7ef; }
.wrong-answer-row { display: flex; align-items: center; gap: 10rpx; margin-top: 10rpx; }
.wa-label { font-size: 24rpx; color: #8d8074; }
.wa-value { font-size: 26rpx; font-weight: 700; }
.wa-value.wrong { color: #e25b3a; } .wa-value.correct { color: #1f9d68; }
.wrong-actions { display: flex; align-items: center; gap: 12rpx; margin-top: 16rpx; flex-wrap: wrap; }
.mark-mastered { font-size: 24rpx; color: #1f9d68; padding: 14rpx 18rpx; background: #e7f7ef; border-radius: 999rpx; flex-shrink: 0; }

.harmony-card { background: linear-gradient(135deg, #ffe8d4, #ffe1ea); border-radius: 24rpx; padding: 24rpx; margin: 18rpx 0; }
.harmony-title { font-size: 28rpx; font-weight: 700; color: #2c241c; display: block; margin-bottom: 14rpx; }
.harmony-score-wrap { display: flex; align-items: center; gap: 24rpx; }
.harmony-circle { width: 120rpx; height: 120rpx; border-radius: 50%; background: linear-gradient(135deg, #ff7a4d, #ff5f86); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.harmony-num { color: #fff; font-size: 44rpx; font-weight: 700; }
.harmony-info { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.harmony-item { display: flex; justify-content: space-between; font-size: 24rpx; color: #6a5a4c; }

.form-label { margin: 24rpx 4rpx 12rpx; font-weight: 650; font-size: 26rpx; color: #3d342c; }
.picker-box { display: flex; justify-content: space-between; align-items: center; }
.picker-arrow { color: #c47a4a; font-size: 22rpx; }
.star-card { background: #fff8f1; border-radius: 24rpx; padding: 18rpx 20rpx 16rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.stars { display: flex; gap: 10rpx; }
.stars text { font-size: 52rpx; color: #e8d8c4; transition: transform .15s; }
.stars text.active { color: #ffb020; transform: scale(1.1); }
.star-caption { font-size: 24rpx; color: #8d8074; }
.comment-box { background: #fff; border: 2rpx solid #f0e4d4; border-radius: 16rpx; padding: 16rpx 20rpx; font-size: 26rpx; min-height: 120rpx; width: 100%; box-sizing: border-box; }
.result-note { margin-top: 16rpx; padding: 14rpx 20rpx; background: #e7f7ef; border-radius: 16rpx; color: #1f9d68; font-size: 26rpx; }

.eval-row { background: #fff8f1; border-radius: 16rpx; padding: 18rpx 20rpx; margin-top: 14rpx; }
.eval-direction { font-size: 24rpx; color: #c47a4a; font-weight: 600; margin-bottom: 8rpx; }
.eval-item { font-size: 28rpx; font-weight: 700; color: #2c241c; display: block; }
.eval-stars { display: flex; gap: 4rpx; margin: 6rpx 0; }
.eval-stars text { font-size: 28rpx; color: #e8d8c4; }
.eval-stars text.active { color: #ffb020; }
.eval-comment { font-size: 24rpx; color: #6a5a4c; display: block; margin: 4rpx 0; }
.eval-time { font-size: 20rpx; color: #b8a894; display: block; text-align: right; }

.filter-tabs { display: flex; gap: 12rpx; margin-bottom: 18rpx; }
.filter-tab { padding: 10rpx 24rpx; border-radius: 999rpx; font-size: 24rpx; color: #8d8074; background: #fff8f1; }
.filter-tab.active { background: #ff7a4d; color: #fff; }

.child-card { background: #fff; border-radius: 24rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 10rpx 24rpx rgba(90,50,20,0.05); }
.child-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.child-name { font-size: 32rpx; font-weight: 700; color: #2c241c; }
.child-badges { display: flex; gap: 8rpx; }
.child-badge { background: #fff2e4; color: #c47a4a; font-size: 22rpx; padding: 6rpx 14rpx; border-radius: 999rpx; }
.child-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.child-stat { text-align: center; background: #fff8f1; border-radius: 16rpx; padding: 14rpx 6rpx; }
.cs-num { display: block; font-size: 30rpx; font-weight: 700; color: #ff5f3a; }
.cs-label { display: block; font-size: 20rpx; color: #8d8074; margin-top: 4rpx; }
.week-minutes { margin-top: 14rpx; }
.wm-label { font-size: 22rpx; color: #6a5a4c; display: block; margin-bottom: 8rpx; }

.goal-row { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; border-bottom: 2rpx dashed #f0e4d4; }
.goal-row:last-child { border-bottom: none; }
.goal-dot { width: 56rpx; height: 56rpx; border-radius: 50%; background: #fff2e4; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.goal-info { flex: 1; }
.goal-title { font-size: 28rpx; font-weight: 700; color: #2c241c; display: block; }
.goal-sub { font-size: 22rpx; color: #8d8074; }
.new-goal { margin-top: 14rpx; display: flex; flex-direction: column; gap: 12rpx; }
.goal-minutes-row { display: flex; align-items: center; gap: 14rpx; }
.gml-label { font-size: 24rpx; color: #6a5a4c; }
.mini-input { background: #fff; border: 2rpx solid #f0e4d4; border-radius: 12rpx; padding: 8rpx 14rpx; font-size: 26rpx; width: 120rpx; text-align: center; }

.limit-card { background: #fff8f1; border-radius: 20rpx; padding: 20rpx; margin-bottom: 14rpx; }
.limit-title { font-size: 28rpx; font-weight: 700; color: #2c241c; margin-bottom: 10rpx; display: block; }
.limit-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.limit-label { font-size: 24rpx; color: #6a5a4c; }
.limit-value { font-size: 26rpx; font-weight: 700; color: #ff7a4d; }
.limit-btns { display: flex; gap: 12rpx; }
.limit-btn { flex: 1; text-align: center; padding: 14rpx; border-radius: 16rpx; background: #fff; color: #6a5a4c; font-size: 26rpx; }
.limit-btn.primary { background: #ff7a4d; color: #fff; }

.tabs-row { display: flex; gap: 6rpx; background: #fff8f1; padding: 6rpx; border-radius: 16rpx; margin-bottom: 16rpx; }
.mini-tab { flex: 1; text-align: center; padding: 12rpx; border-radius: 12rpx; font-size: 26rpx; color: #8d8074; }
.mini-tab.active { background: #fff; color: #ff7a4d; font-weight: 700; }
.report-hero { text-align: center; padding: 18rpx 0 12rpx; }
.report-number { font-size: 72rpx; font-weight: 800; color: #ff7a4d; display: block; }
.report-label { font-size: 24rpx; color: #8d8074; }
.metric { margin-top: 12rpx; }
.metric-row { display: flex; justify-content: space-between; padding: 12rpx 0; }
.metric-row text:first-child { color: #6a5a4c; font-size: 26rpx; }
.metric-value { font-weight: 700; color: #2c241c; font-size: 26rpx; }

.growth-hero { display: flex; gap: 24rpx; padding: 12rpx 0; }
.level-circle { width: 140rpx; height: 140rpx; border-radius: 50%; background: linear-gradient(135deg, #ffb067, #ff5f86); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.level-num { font-size: 48rpx; font-weight: 800; line-height: 1; }
.level-label { font-size: 22rpx; margin-top: 4rpx; }
.growth-info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 12rpx; }
.growth-exp { font-size: 24rpx; color: #8d8074; display: block; text-align: right; }
.growth-stats-row { display: flex; gap: 10rpx; }
.growth-mini-stat { flex: 1; background: #fff8f1; border-radius: 14rpx; padding: 12rpx 6rpx; text-align: center; }
.gms-num { display: block; font-size: 28rpx; font-weight: 700; color: #ff5f3a; }
.gms-label { font-size: 20rpx; color: #8d8074; }

.achievements-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14rpx; }
.ach-card { background: #fff8f1; border-radius: 16rpx; padding: 16rpx 10rpx; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.ach-card.locked { opacity: 0.5; }
.ach-icon { font-size: 40rpx; }
.ach-name { font-size: 22rpx; font-weight: 700; color: #2c241c; }
.ach-desc { font-size: 18rpx; color: #8d8074; line-height: 1.3; }

.rank-row { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; border-bottom: 2rpx dashed #f0e4d4; }
.rank-row:last-child { border-bottom: none; }
.rank-row.me { background: #fff8f1; border-radius: 12rpx; padding: 14rpx; }
.rank-num { width: 48rpx; height: 48rpx; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; color: #6a5a4c; flex-shrink: 0; }
.rank-num.r1 { background: #ffd700; color: #fff; }
.rank-num.r2 { background: #c0c0c0; color: #fff; }
.rank-num.r3 { background: #cd7f32; color: #fff; }
.rank-info { flex: 1; }
.rank-name { font-size: 28rpx; font-weight: 700; color: #2c241c; display: block; }
.rank-sub { font-size: 22rpx; color: #8d8074; }
.rank-mini-stat { font-size: 24rpx; color: #ff7a4d; font-weight: 700; }

.curve-wrap { padding: 12rpx 0; }
.curve-chart { display: flex; justify-content: space-between; align-items: flex-end; height: 200rpx; gap: 8rpx; padding: 0 8rpx; }
.curve-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.curve-bar { width: 100%; max-width: 36rpx; min-height: 4rpx; background: linear-gradient(180deg, #ffb067, #ff5f86); border-radius: 6rpx 6rpx 0 0; }
.curve-label { font-size: 18rpx; color: #8d8074; }

.chat-list { max-height: 400rpx; overflow-y: auto; margin: 16rpx 0; display: flex; flex-direction: column; gap: 14rpx; }
.chat-row { display: flex; gap: 12rpx; align-items: flex-start; }
.chat-row.user { flex-direction: row-reverse; }
.chat-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; background: #ffb067; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 26rpx; }
.chat-row.user .chat-avatar { background: #ff5f86; }
.chat-bubble { max-width: 72%; background: #fff8f1; border-radius: 18rpx; padding: 14rpx 18rpx; font-size: 26rpx; color: #2c241c; line-height: 1.5; white-space: pre-wrap; }
.chat-row.user .chat-bubble { background: #ff7a4d; color: #fff; }
.chat-input-row { display: flex; gap: 10rpx; align-items: center; margin-top: 10rpx; }
.chat-input { flex: 1; background: #fff; border: 2rpx solid #f0e4d4; border-radius: 20rpx; padding: 14rpx 22rpx; font-size: 26rpx; }
.send-btn { background: #ff7a4d; color: #fff; border-radius: 20rpx; padding: 14rpx 28rpx; font-size: 26rpx; font-weight: 600; border: none; }
.send-btn:disabled { opacity: 0.6; }

.ai-tip { background: #fff8f1; border-radius: 16rpx; padding: 16rpx 20rpx; font-size: 24rpx; color: #8d8074; line-height: 1.5; margin-bottom: 14rpx; }
.quick-questions { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 12rpx; }
.quick-chip { background: #fff; border: 2rpx solid #f0e4d4; border-radius: 16rpx; padding: 10rpx 18rpx; font-size: 24rpx; color: #6a5a4c; }
.safety-note { font-size: 20rpx; color: #b8a894; text-align: center; margin-top: 14rpx; display: block; }

.question-card { background: #fff; border-radius: 20rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 8rpx 20rpx rgba(90,50,20,0.04); }
.q-badge { background: #fff2e4; color: #c47a4a; font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 999rpx; font-weight: 600; margin-bottom: 12rpx; display: inline-block; }
.q-badge.small { font-size: 20rpx; padding: 4rpx 12rpx; }
.question-text { font-size: 32rpx; font-weight: 700; color: #2c241c; margin-bottom: 16rpx; display: block; line-height: 1.4; }
.options { display: flex; flex-direction: column; gap: 10rpx; margin-bottom: 14rpx; }
.option { display: flex; align-items: center; gap: 12rpx; background: #fff8f1; border-radius: 14rpx; padding: 14rpx 18rpx; border: 2rpx solid transparent; }
.option.selected { background: #fff2e4; border-color: #ff7a4d; }
.option-dot { width: 28rpx; height: 28rpx; border-radius: 50%; background: #e8d8c4; flex-shrink: 0; }
.option.selected .option-dot { background: #ff7a4d; }
.option-text { font-size: 28rpx; color: #2c241c; }
.answer-input { background: #fff; border: 2rpx solid #f0e4d4; border-radius: 14rpx; padding: 14rpx 20rpx; font-size: 26rpx; margin-bottom: 14rpx; width: 100%; box-sizing: border-box; }
.answer-input.small { font-size: 24rpx; padding: 10rpx 16rpx; margin-bottom: 0; flex: 1; }
.small-primary { background: #ff7a4d; color: #fff; border-radius: 14rpx; padding: 12rpx 24rpx; font-size: 26rpx; font-weight: 600; border: none; }
.gen-btn { background: #fff2e4; color: #c47a4a; border-radius: 999rpx; padding: 8rpx 20rpx; font-size: 24rpx; font-weight: 600; }

.empty { text-align: center; padding: 40rpx 0; color: #8d8074; font-size: 26rpx; }
.empty-emoji { font-size: 60rpx; display: block; margin-bottom: 10rpx; }

.panel { background: #fff; border-radius: 30rpx; padding: 24rpx 24rpx 28rpx; margin-bottom: 18rpx; box-shadow: 0 12rpx 28rpx rgba(90,50,20,0.05); }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.panel-title { font-size: 30rpx; font-weight: 700; color: #2c241c; }
.panel-tag { font-size: 22rpx; color: #c47a4a; background: #fff2e4; padding: 6rpx 16rpx; border-radius: 999rpx; }
.panel-tag.done { color: #1f9d68; background: #e7f7ef; }
.panel-actions { display: flex; align-items: center; gap: 10rpx; }

.tabbar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: #fff; box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.06); padding: 10rpx 0 calc(10rpx + env(safe-area-inset-bottom)); z-index: 100; max-width: 480px; margin: 0 auto; }
.tab { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 8rpx 0; color: #8d8074; }
.tab.active { color: #ff7a4d; }
.tab-icon { font-size: 36rpx; }
.tab-name { font-size: 20rpx; font-weight: 600; }
</style>