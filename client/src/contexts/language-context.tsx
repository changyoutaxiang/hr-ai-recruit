import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 支持的语言类型
export type Language = 'en' | 'zh';

// 语言上下文类型
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

// 翻译数据结构
interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}

// 翻译文本数据
const translations: Translations = {
  // 通用
  'common.loading': { en: 'Loading...', zh: '加载中...' },
  'common.save': { en: 'Save', zh: '保存' },
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.delete': { en: 'Delete', zh: '删除' },
  'common.edit': { en: 'Edit', zh: '编辑' },
  'common.add': { en: 'Add', zh: '添加' },
  'common.search': { en: 'Search', zh: '搜索' },
  'common.submit': { en: 'Submit', zh: '提交' },
  'common.close': { en: 'Close', zh: '关闭' },
  'common.back': { en: 'Back', zh: '返回' },
  'common.next': { en: 'Next', zh: '下一步' },
  'common.previous': { en: 'Previous', zh: '上一步' },
  'common.confirm': { en: 'Confirm', zh: '确认' },
  'common.view': { en: 'View', zh: '查看' },
  'common.download': { en: 'Download', zh: '下载' },
  'common.upload': { en: 'Upload', zh: '上传' },
  'common.refresh': { en: 'Refresh', zh: '刷新' },
  'common.filter': { en: 'Filter', zh: '筛选' },
  'common.export': { en: 'Export', zh: '导出' },
  'common.import': { en: 'Import', zh: '导入' },
  'common.action': { en: 'Action', zh: '操作' },

  // 品牌
  'brand.name': { en: 'AI Recruit', zh: 'AI 招聘' },
  'brand.tagline': { en: 'Smart Hiring Platform', zh: '智能招聘平台' },

  // 导航
  'nav.dashboard': { en: 'Dashboard', zh: '仪表板' },
  'nav.candidates': { en: 'Candidates', zh: '候选人' },
  'nav.jobs': { en: 'Jobs', zh: '职位' },
  'nav.interviews': { en: 'Interviews', zh: '面试' },
  'nav.assistant': { en: 'AI Assistant', zh: 'AI 助手' },
  'nav.reports': { en: 'Reports', zh: '报告' },
  'nav.funnelAnalysis': { en: 'Funnel Analysis', zh: '漏斗分析' },
  'nav.preferences': { en: 'Preferences', zh: '偏好设置' },
  'nav.templates': { en: 'Templates', zh: '模板' },
  'nav.analytics': { en: 'Analytics', zh: '分析' },
  'nav.settings': { en: 'Settings', zh: '设置' },
  'nav.profile': { en: 'Profile', zh: '个人资料' },
  'nav.logout': { en: 'Logout', zh: '退出登录' },

  // 仪表板
  'dashboard.title': { en: 'HR Recruitment Dashboard', zh: 'HR 招聘仪表板' },
  'dashboard.totalCandidates': { en: 'Total Candidates', zh: '候选人总数' },
  'dashboard.activeJobs': { en: 'Active Jobs', zh: '活跃职位' },
  'dashboard.upcomingInterviews': { en: 'Upcoming Interviews', zh: '即将到来的面试' },
  'dashboard.teamActivity': { en: 'Team Activity', zh: '团队动态' },
  'dashboard.teamOnline': { en: 'Team Online', zh: '在线团队' },
  'dashboard.notifications': { en: 'Notifications', zh: '通知' },
  'dashboard.recentActivity': { en: 'Recent Activity', zh: '最近活动' },
  'dashboard.quickActions': { en: 'Quick Actions', zh: '快速操作' },
  'dashboard.addCandidate': { en: 'Add Candidate', zh: '添加候选人' },
  'dashboard.postJob': { en: 'Post Job', zh: '发布职位' },
  'dashboard.scheduleInterview': { en: 'Schedule Interview', zh: '安排面试' },
  'dashboard.viewReports': { en: 'View Reports', zh: '查看报告' },
  'dashboard.recruitmentFunnel': { en: 'Recruitment Funnel', zh: '招聘漏斗' },
  'dashboard.aiInsights': { en: 'AI Insights', zh: 'AI 洞察' },
  'dashboard.topCandidates': { en: 'Top Matching Candidates', zh: '最佳匹配候选人' },
  'dashboard.viewAllCandidates': { en: 'View all candidates', zh: '查看所有候选人' },
  'dashboard.openAiAssistant': { en: 'Open AI Assistant', zh: '打开 AI 助手' },
  'dashboard.welcomeMessage': { en: 'Welcome back, Sarah! Here\'s your recruitment overview.', zh: '欢迎回来，Sarah！这是您的招聘概览。' },
  'dashboard.interviewRate': { en: 'Interview Rate', zh: '面试率' },
  'dashboard.hireRate': { en: 'Hire Rate', zh: '录用率' },
  'dashboard.fromLastMonth': { en: 'from last month', zh: '与上月相比' },
  'dashboard.newThisWeek': { en: 'new this week', zh: '本周新增' },
  'dashboard.improvement': { en: 'improvement', zh: '提升' },
  'dashboard.fromTarget': { en: 'from target', zh: '距离目标' },
  'dashboard.last30Days': { en: 'Last 30 days', zh: '最近 30 天' },
  'dashboard.last90Days': { en: 'Last 90 days', zh: '最近 90 天' },
  'dashboard.thisYear': { en: 'This year', zh: '今年' },

  // AI 洞察
  'insights.candidateMatch': { en: 'candidates match the Senior Developer position requirements', zh: '位候选人符合高级开发工程师职位要求' },
  'insights.interviewRate': { en: 'Interview completion rate increased by 15% this month', zh: '本月面试完成率提高了 15%' },
  'insights.urgentCandidates': { en: 'high-priority candidates haven\'t been contacted yet', zh: '位高优先级候选人尚未联系' },

  // 招聘漏斗
  'funnel.applicationsReceived': { en: 'Applications Received', zh: '收到申请' },
  'funnel.screeningPassed': { en: 'Screening Passed', zh: '通过筛选' },
  'funnel.interviewsScheduled': { en: 'Interviews Scheduled', zh: '安排面试' },
  'funnel.hired': { en: 'Hired', zh: '已录用' },

  // 候选人
  'candidates.title': { en: 'Candidates', zh: '候选人' },
  'candidates.addNew': { en: 'Add New Candidate', zh: '添加新候选人' },
  'candidates.name': { en: 'Name', zh: '姓名' },
  'candidates.email': { en: 'Email', zh: '邮箱' },
  'candidates.phone': { en: 'Phone', zh: '电话' },
  'candidates.position': { en: 'Position', zh: '职位' },
  'candidates.status': { en: 'Status', zh: '状态' },
  'candidates.experience': { en: 'Experience', zh: '工作经验' },
  'candidates.skills': { en: 'Skills', zh: '技能' },
  'candidates.resume': { en: 'Resume', zh: '简历' },
  'candidates.notes': { en: 'Notes', zh: '备注' },
  'candidates.createdAt': { en: 'Created At', zh: '创建时间' },
  'candidates.uploadResume': { en: 'Upload Resume', zh: '上传简历' },
  'candidates.analyzeResume': { en: 'Analyze Resume', zh: '分析简历' },
  'candidates.matchJobs': { en: 'Match Jobs', zh: '匹配职位' },
  'candidates.matchScore': { en: 'Match Score', zh: '匹配度' },
  'candidates.viewProfile': { en: 'View Profile', zh: '查看资料' },
  'candidates.noCandidates': { en: 'No candidates found', zh: '未找到候选人' },
  'candidates.addCandidatesHint': { en: 'Add candidates to see them here', zh: '添加候选人以在此显示' },

  // 候选人状态
  'status.applied': { en: 'Applied', zh: '已申请' },
  'status.screening': { en: 'Screening', zh: '筛选中' },
  'status.interviewing': { en: 'Interviewing', zh: '面试中' },
  'status.offer': { en: 'Offer', zh: '已录用' },
  'status.hired': { en: 'Hired', zh: '已入职' },
  'status.rejected': { en: 'Rejected', zh: '已拒绝' },

  // 职位
  'jobs.title': { en: 'Jobs', zh: '职位' },
  'jobs.addNew': { en: 'Add New Job', zh: '发布新职位' },
  'jobs.jobTitle': { en: 'Job Title', zh: '职位名称' },
  'jobs.department': { en: 'Department', zh: '部门' },
  'jobs.location': { en: 'Location', zh: '工作地点' },
  'jobs.type': { en: 'Job Type', zh: '工作类型' },
  'jobs.salary': { en: 'Salary', zh: '薪资' },
  'jobs.description': { en: 'Description', zh: '职位描述' },
  'jobs.requirements': { en: 'Requirements', zh: '职位要求' },
  'jobs.benefits': { en: 'Benefits', zh: '福利待遇' },
  'jobs.postedDate': { en: 'Posted Date', zh: '发布日期' },
  'jobs.deadline': { en: 'Application Deadline', zh: '申请截止日期' },
  'jobs.applicants': { en: 'Applicants', zh: '申请人数' },

  // 工作类型
  'jobType.fullTime': { en: 'Full-time', zh: '全职' },
  'jobType.partTime': { en: 'Part-time', zh: '兼职' },
  'jobType.contract': { en: 'Contract', zh: '合同工' },
  'jobType.internship': { en: 'Internship', zh: '实习' },
  'jobType.remote': { en: 'Remote', zh: '远程' },

  // 面试
  'interviews.title': { en: 'Interviews', zh: '面试' },
  'interviews.schedule': { en: 'Schedule Interview', zh: '安排面试' },
  'interviews.candidate': { en: 'Candidate', zh: '候选人' },
  'interviews.position': { en: 'Position', zh: '职位' },
  'interviews.interviewer': { en: 'Interviewer', zh: '面试官' },
  'interviews.date': { en: 'Date', zh: '日期' },
  'interviews.time': { en: 'Time', zh: '时间' },
  'interviews.type': { en: 'Interview Type', zh: '面试类型' },
  'interviews.notes': { en: 'Interview Notes', zh: '面试记录' },
  'interviews.feedback': { en: 'Feedback', zh: '反馈' },
  'interviews.rating': { en: 'Rating', zh: '评分' },
  'interviews.recommendation': { en: 'Recommendation', zh: '推荐意见' },

  // 面试类型
  'interviewType.phone': { en: 'Phone', zh: '电话面试' },
  'interviewType.video': { en: 'Video', zh: '视频面试' },
  'interviewType.inPerson': { en: 'In-person', zh: '现场面试' },
  'interviewType.technical': { en: 'Technical', zh: '技术面试' },
  'interviewType.hr': { en: 'HR', zh: 'HR面试' },
  'interviewType.final': { en: 'Final', zh: '终面' },

  // AI 助手
  'assistant.title': { en: 'AI Assistant', zh: 'AI 助手' },
  'assistant.askQuestion': { en: 'Ask a question...', zh: '问个问题...' },
  'assistant.typeMessage': { en: 'Type your message...', zh: '输入您的消息...' },
  'assistant.send': { en: 'Send', zh: '发送' },
  'assistant.clear': { en: 'Clear Chat', zh: '清空对话' },
  'assistant.suggestions': { en: 'Suggestions', zh: '建议' },
  'assistant.templates': { en: 'Template Library', zh: '模板库' },
  'assistant.history': { en: 'Chat History', zh: '对话历史' },

  // 团队协作
  'team.activity': { en: 'Team Activity', zh: '团队动态' },
  'team.online': { en: 'Team Online', zh: '在线团队' },
  'team.noActivity': { en: 'No recent activity', zh: '暂无最近活动' },
  'team.noOneOnline': { en: 'No one is online', zh: '暂无在线成员' },
  'team.connectionStatus': { en: 'Live', zh: '实时' },
  'team.offline': { en: 'Offline', zh: '离线' },

  // 通知
  'notifications.title': { en: 'Notifications', zh: '通知' },
  'notifications.noNotifications': { en: 'No notifications', zh: '暂无通知' },
  'notifications.markAllRead': { en: 'Mark all as read', zh: '全部标记为已读' },
  'notifications.unread': { en: 'unread', zh: '条未读' },

  // 表单验证
  'validation.required': { en: 'This field is required', zh: '此字段为必填项' },
  'validation.email': { en: 'Please enter a valid email', zh: '请输入有效的邮箱地址' },
  'validation.phone': { en: 'Please enter a valid phone number', zh: '请输入有效的电话号码' },
  'validation.minLength': { en: 'Minimum {count} characters required', zh: '至少需要 {count} 个字符' },
  'validation.maxLength': { en: 'Maximum {count} characters allowed', zh: '最多允许 {count} 个字符' },

  // 语言切换
  'language.switch': { en: 'Switch Language', zh: '切换语言' },
  'language.chinese': { en: '中文', zh: '中文' },
  'language.english': { en: 'English', zh: 'English' },

  // 错误信息
  'error.generic': { en: 'Something went wrong', zh: '出现错误' },
  'error.network': { en: 'Network error', zh: '网络错误' },
  'error.notFound': { en: 'Not found', zh: '未找到' },
  'error.unauthorized': { en: 'Unauthorized', zh: '未授权' },
  'error.forbidden': { en: 'Forbidden', zh: '禁止访问' },
  'error.serverError': { en: 'Server error', zh: '服务器错误' },

  // 成功信息
  'success.saved': { en: 'Saved successfully', zh: '保存成功' },
  'success.deleted': { en: 'Deleted successfully', zh: '删除成功' },
  'success.updated': { en: 'Updated successfully', zh: '更新成功' },
  'success.created': { en: 'Created successfully', zh: '创建成功' },
  'success.uploaded': { en: 'Uploaded successfully', zh: '上传成功' },

  // 职位页面
  'jobs.pageTitle': { en: 'Job Postings', zh: '职位发布' },
  'jobs.pageSubtitle': { en: 'Manage your open positions and track applications', zh: '管理您的职位空缺并跟踪申请' },
  'jobs.createJob': { en: 'Create Job', zh: '创建职位' },
  'jobs.searchPlaceholder': { en: 'Search jobs...', zh: '搜索职位...' },
  'jobs.allStatuses': { en: 'All Statuses', zh: '所有状态' },
  'jobs.active': { en: 'Active', zh: '有效' },
  'jobs.paused': { en: 'Paused', zh: '暂停' },
  'jobs.closed': { en: 'Closed', zh: '关闭' },
  'jobs.allDepartments': { en: 'All Departments', zh: '所有部门' },
  'jobs.moreFilters': { en: 'More Filters', zh: '更多筛选' },
  'jobs.jobCount': { en: '{filtered} of {total} jobs', zh: '{filtered} / {total} 个职位' },
  'jobs.noJobsFound': { en: 'No jobs found', zh: '未找到职位' },
  'jobs.noJobsYet': { en: 'No jobs yet', zh: '暂无职位' },
  'jobs.adjustFilters': { en: 'Try adjusting your search or filters', zh: '请调整搜索条件或筛选器' },
  'jobs.getStartedHint': { en: 'Get started by creating your first job posting', zh: '创建您的第一个职位来开始吧' },
  'jobs.createFirstJob': { en: 'Create First Job', zh: '创建第一个职位' },
  'jobs.failedToLoad': { en: 'Failed to load jobs', zh: '职位加载失败' },
  'jobs.retry': { en: 'Retry', zh: '重试' },

  // 面试页面
  'interviews.pageTitle': { en: 'Interviews', zh: '面试' },
  'interviews.pageSubtitle': { en: 'Schedule and manage candidate interviews', zh: '安排和管理候选人面试' },
  'interviews.scheduleInterview': { en: 'Schedule Interview', zh: '安排面试' },
  'interviews.searchPlaceholder': { en: 'Search interviews...', zh: '搜索面试...' },
  'interviews.scheduled': { en: 'Scheduled', zh: '已安排' },
  'interviews.completed': { en: 'Completed', zh: '已完成' },
  'interviews.cancelled': { en: 'Cancelled', zh: '已取消' },
  'interviews.noShow': { en: 'No Show', zh: '未出席' },
  'interviews.allTypes': { en: 'All Types', zh: '所有类型' },
  'interviews.phone': { en: 'Phone', zh: '电话' },
  'interviews.video': { en: 'Video', zh: '视频' },
  'interviews.inPerson': { en: 'In Person', zh: '现场' },
  'interviews.today': { en: 'Today', zh: '今天' },
  'interviews.total': { en: 'Total', zh: '总计' },
  'interviews.interviewCount': { en: '{filtered} of {total} interviews', zh: '{filtered} / {total} 个面试' },
  'interviews.noInterviewsFound': { en: 'No interviews found', zh: '未找到面试' },
  'interviews.noInterviewsScheduled': { en: 'No interviews scheduled', zh: '暂无安排面试' },
  'interviews.getStartedInterview': { en: 'Get started by scheduling your first interview', zh: '安排您的第一次面试来开始吧' },
  'interviews.scheduleFirstInterview': { en: 'Schedule First Interview', zh: '安排第一次面试' },
  'interviews.failedToLoad': { en: 'Failed to load interviews', zh: '面试加载失败' },

  // AI助手页面
  'assistant.pageTitle': { en: 'AI Assistant', zh: 'AI 助手' },
  'assistant.pageSubtitle': { en: 'Get AI-powered help with your recruitment tasks', zh: '获得AI驱动的招聘任务帮助' },
  'assistant.quickActions': { en: 'Quick Actions', zh: '快速操作' },
  'assistant.analyzeResume': { en: 'Analyze Resume', zh: '简历分析' },
  'assistant.analyzeResumeDesc': { en: 'Get AI insights on candidate resumes', zh: '获取候选人简历的AI洞察' },
  'assistant.matchCandidates': { en: 'Match Candidates', zh: '候选人匹配' },
  'assistant.matchCandidatesDesc': { en: 'Find best candidates for a job', zh: '为职位找到最佳候选人' },
  'assistant.generateQuestions': { en: 'Generate Questions', zh: '生成问题' },
  'assistant.generateQuestionsDesc': { en: 'Create interview questions', zh: '创建面试问题' },
  'assistant.jobDescription': { en: 'Job Description', zh: '职位描述' },
  'assistant.jobDescriptionDesc': { en: 'Optimize job postings', zh: '优化职位发布' },
  'assistant.recruitmentInsights': { en: 'Recruitment Insights', zh: '招聘洞察' },
  'assistant.recruitmentInsightsDesc': { en: 'Get data-driven recommendations', zh: '获取数据驱动的建议' },
  'assistant.bestPractices': { en: 'Best Practices', zh: '最佳实践' },
  'assistant.bestPracticesDesc': { en: 'Learn recruitment strategies', zh: '学习招聘策略' },
  'assistant.welcomeMessage': { en: 'Hello! I\'m your AI recruitment assistant. How can I help you today?', zh: '您好！我是您的AI招聘助手。今天我能为您做些什么？' },
  'assistant.initialPromptAnalyze': { en: 'I\'d like to analyze a candidate\'s resume. Can you help me understand what to look for and how to extract key information?', zh: '我想分析候选人的简历。您能帮我理解需要关注什么以及如何提取关键信息吗？' },
  'assistant.initialPromptMatch': { en: 'I need help matching candidates to job positions. What factors should I consider for the best matches?', zh: '我需要帮助将候选人与职位匹配。我应该考虑哪些因素来获得最佳匹配？' },
  'assistant.initialPromptQuestions': { en: 'Can you help me generate relevant interview questions for a specific role?', zh: '您能帮我为特定角色生成相关的面试问题吗？' },
  'assistant.initialPromptOptimize': { en: 'I want to optimize a job description to attract better candidates. What elements should I focus on?', zh: '我想优化职位描述以吸引更好的候选人。我应该关注哪些要素？' },
  'assistant.initialPromptInsights': { en: 'Can you provide insights on our recruitment data and suggest improvements to our hiring process?', zh: '您能提供我们招聘数据的洞察并建议改进我们的招聘流程吗？' },
  'assistant.initialPromptPractices': { en: 'What are the current best practices in recruitment and talent acquisition?', zh: '目前招聘和人才获取的最佳实践是什么？' },
  'assistant.backToActions': { en: 'Back to Actions', zh: '返回操作' },
  'assistant.chatPlaceholder': { en: 'Type your message...', zh: '输入您的消息...' },
  'assistant.sendMessage': { en: 'Send message', zh: '发送消息' },
  'assistant.errorResponse': { en: 'Failed to get AI response. Please try again.', zh: 'AI响应失败，请重试。' },
  'assistant.copyMessage': { en: 'Copy message', zh: '复制消息' },
  'assistant.likeMessage': { en: 'Like message', zh: '点赞消息' },
  'assistant.dislikeMessage': { en: 'Dislike message', zh: '点踩消息' },

  // 候选人页面
  'candidates.pageTitle': { en: 'Candidates', zh: '候选人' },
  'candidates.pageSubtitle': { en: 'Manage and track your candidate pipeline', zh: '管理和跟踪您的候选人管道' },
  'candidates.importCandidates': { en: 'Import', zh: '导入' },
  'candidates.exportCandidates': { en: 'Export', zh: '导出' },
  'candidates.addCandidate': { en: 'Add Candidate', zh: '添加候选人' },
  'candidates.addNewCandidate': { en: 'Add New Candidate', zh: '添加新候选人' },
  'candidates.searchPlaceholder': { en: 'Search candidates...', zh: '搜索候选人...' },
  'candidates.allSources': { en: 'All Sources', zh: '所有来源' },
  'candidates.manual': { en: 'Manual', zh: '手动' },
  'candidates.linkedin': { en: 'LinkedIn', zh: 'LinkedIn' },
  'candidates.jobBoard': { en: 'Job Board', zh: '招聘网站' },
  'candidates.referral': { en: 'Referral', zh: '推荐' },
  'candidates.candidateCount': { en: '{filtered} of {total} candidates', zh: '{filtered} / {total} 个候选人' },
  'candidates.applied': { en: 'Applied', zh: '已申请' },
  'candidates.screening': { en: 'Screening', zh: '筛选中' },
  'candidates.interview': { en: 'Interview', zh: '面试中' },
  'candidates.hired': { en: 'Hired', zh: '已录用' },
  'candidates.noCandidatesFound': { en: 'No candidates found', zh: '未找到候选人' },
  'candidates.noCandidatesYet': { en: 'No candidates yet', zh: '暂无候选人' },
  'candidates.getStartedCandidate': { en: 'Get started by adding your first candidate', zh: '添加您的第一个候选人来开始吧' },
  'candidates.addFirstCandidate': { en: 'Add First Candidate', zh: '添加第一个候选人' },
  'candidates.failedToLoad': { en: 'Failed to load candidates', zh: '候选人加载失败' },
  'candidates.candidateCreated': { en: 'Candidate created', zh: '候选人已创建' },
  'candidates.candidateCreatedDesc': { en: 'New candidate has been added successfully.', zh: '新候选人已成功添加。' },
  'candidates.createCandidateError': { en: 'Failed to create candidate.', zh: '创建候选人失败。' },
  'candidates.resumeUpload': { en: 'Resume Upload', zh: '简历上传' },
  'candidates.resumeUploadDesc': { en: 'Upload and analyze candidate resume', zh: '上传并分析候选人简历' },
  'candidates.backToCandidates': { en: 'Back to Candidates', zh: '返回候选人' },
  'candidates.resumeAnalysisComplete': { en: 'Resume analysis complete', zh: '简历分析完成' },
  'candidates.resumeAnalysisCompleteDesc': { en: 'Candidate profile has been updated with AI insights.', zh: '候选人资料已更新AI洞察。' },
  'candidates.formName': { en: 'Name *', zh: '姓名 *' },
  'candidates.formEmail': { en: 'Email *', zh: '邮箱 *' },
  'candidates.formPhone': { en: 'Phone', zh: '电话' },
  'candidates.formPosition': { en: 'Position', zh: '职位' },
  'candidates.formLocation': { en: 'Location', zh: '地点' },
  'candidates.formSource': { en: 'Source', zh: '来源' },
  'candidates.createCandidate': { en: 'Create Candidate', zh: '创建候选人' },
  'candidates.creating': { en: 'Creating...', zh: '创建中...' },

  // 模板页面
  'templates.pageTitle': { en: 'Prompt Templates', zh: '提示模板' },
  'templates.pageSubtitle': { en: 'Manage AI prompt templates for consistent recruitment workflows', zh: '管理AI提示模板以保持招聘流程的一致性' },

  // 404错误页面
  'notFound.title': { en: '404 Page Not Found', zh: '404 页面未找到' },
  'notFound.description': { en: 'Did you forget to add the page to the router?', zh: '您是否忘记将页面添加到路由器中？' },
};

// 创建语言上下文
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 语言提供者组件
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    // 从 localStorage 读取保存的语言设置，默认为英文
    const saved = localStorage.getItem('preferred-language');
    return (saved as Language) || 'en';
  });

  // 保存语言设置到 localStorage
  useEffect(() => {
    localStorage.setItem('preferred-language', language);
  }, [language]);

  // 翻译函数
  const t = (key: string, params?: Record<string, string>): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    let text = translation[language];
    
    // 处理参数替换
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, value);
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// 使用语言上下文的 Hook
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}