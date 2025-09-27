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

  // 导航
  'nav.dashboard': { en: 'Dashboard', zh: '仪表板' },
  'nav.candidates': { en: 'Candidates', zh: '候选人' },
  'nav.jobs': { en: 'Jobs', zh: '职位' },
  'nav.interviews': { en: 'Interviews', zh: '面试' },
  'nav.assistant': { en: 'AI Assistant', zh: 'AI 助手' },
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