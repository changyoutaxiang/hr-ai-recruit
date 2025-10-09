import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, Language } from "@/contexts/language-context";
import { 
  Settings, 
  User, 
  Bell, 
  Globe, 
  Palette, 
  Shield,
  Save,
  RefreshCw
} from "lucide-react";

export default function PreferencesPage() {
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  
  // 用户偏好设置状态
  const [preferences, setPreferences] = useState({
    // 个人信息
    displayName: "",
    email: "",
    phone: "",
    department: "",
    
    // 通知设置
    emailNotifications: true,
    pushNotifications: true,
    candidateUpdates: true,
    interviewReminders: true,
    systemAlerts: true,
    
    // 界面设置
    language: language as Language,
    theme: "system", // light, dark, system
    timezone: "Asia/Shanghai",
    dateFormat: "YYYY-MM-DD",
    
    // AI 助手设置
    aiAssistantEnabled: true,
    autoGenerateProfiles: true,
    aiSuggestions: true,
    
    // 工作流设置
    defaultInterviewDuration: 60,
    autoScheduleFollowups: false,
    requireApprovalForDecisions: true,
    
    // 隐私设置
    shareDataWithTeam: true,
    allowAnalytics: true,
    
    // 自定义设置
    signature: "",
    notes: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // 这里应该调用 API 保存设置
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟 API 调用
      
      // 更新语言设置
      if (preferences.language !== language) {
        setLanguage(preferences.language);
      }
      
      toast({
        title: "设置已保存",
        description: "您的偏好设置已成功更新",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: "保存设置时出现错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    // 重置为默认设置
    setPreferences(prev => ({
      ...prev,
      theme: "system",
      language: "zh" as Language,
      emailNotifications: true,
      pushNotifications: true,
      aiAssistantEnabled: true,
      autoGenerateProfiles: true,
    }));
    
    toast({
      title: "设置已重置",
      description: "偏好设置已恢复为默认值",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">偏好设置</h1>
          <p className="text-muted-foreground">管理您的个人偏好和系统设置</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 个人信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              个人信息
            </CardTitle>
            <CardDescription>
              更新您的个人资料信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">显示名称</Label>
                <Input
                  id="displayName"
                  value={preferences.displayName}
                  onChange={(e) => setPreferences(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="请输入您的显示名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  value={preferences.email}
                  onChange={(e) => setPreferences(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="请输入邮箱地址"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">联系电话</Label>
                <Input
                  id="phone"
                  value={preferences.phone}
                  onChange={(e) => setPreferences(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="请输入联系电话"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">部门</Label>
                <Input
                  id="department"
                  value={preferences.department}
                  onChange={(e) => setPreferences(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="请输入所属部门"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通知设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知设置
            </CardTitle>
            <CardDescription>
              管理您希望接收的通知类型
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>邮件通知</Label>
                  <p className="text-sm text-muted-foreground">接收重要更新的邮件通知</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>推送通知</Label>
                  <p className="text-sm text-muted-foreground">接收浏览器推送通知</p>
                </div>
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, pushNotifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>候选人更新</Label>
                  <p className="text-sm text-muted-foreground">候选人状态变更时通知</p>
                </div>
                <Switch
                  checked={preferences.candidateUpdates}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, candidateUpdates: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>面试提醒</Label>
                  <p className="text-sm text-muted-foreground">面试前发送提醒通知</p>
                </div>
                <Switch
                  checked={preferences.interviewReminders}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, interviewReminders: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>系统警报</Label>
                  <p className="text-sm text-muted-foreground">接收系统维护和错误警报</p>
                </div>
                <Switch
                  checked={preferences.systemAlerts}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, systemAlerts: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 界面设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              界面设置
            </CardTitle>
            <CardDescription>
              自定义您的界面外观和行为
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>语言</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value as Language }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>主题</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">浅色</SelectItem>
                    <SelectItem value="dark">深色</SelectItem>
                    <SelectItem value="system">跟随系统</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>时区</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                    <SelectItem value="America/New_York">纽约时间 (UTC-5)</SelectItem>
                    <SelectItem value="Europe/London">伦敦时间 (UTC+0)</SelectItem>
                    <SelectItem value="Asia/Tokyo">东京时间 (UTC+9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>日期格式</Label>
                <Select
                  value={preferences.dateFormat}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, dateFormat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YYYY-MM-DD">2024-01-15</SelectItem>
                    <SelectItem value="DD/MM/YYYY">15/01/2024</SelectItem>
                    <SelectItem value="MM/DD/YYYY">01/15/2024</SelectItem>
                    <SelectItem value="DD-MM-YYYY">15-01-2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 助手设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              AI 助手设置
            </CardTitle>
            <CardDescription>
              配置 AI 功能和自动化选项
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用 AI 助手</Label>
                  <p className="text-sm text-muted-foreground">使用 AI 协助招聘流程</p>
                </div>
                <Switch
                  checked={preferences.aiAssistantEnabled}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, aiAssistantEnabled: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动生成候选人画像</Label>
                  <p className="text-sm text-muted-foreground">上传简历后自动分析生成画像</p>
                </div>
                <Switch
                  checked={preferences.autoGenerateProfiles}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoGenerateProfiles: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>AI 建议</Label>
                  <p className="text-sm text-muted-foreground">显示 AI 生成的建议和洞察</p>
                </div>
                <Switch
                  checked={preferences.aiSuggestions}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, aiSuggestions: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 工作流设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              工作流设置
            </CardTitle>
            <CardDescription>
              配置招聘流程的默认行为
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>默认面试时长（分钟）</Label>
                <Input
                  type="number"
                  value={preferences.defaultInterviewDuration.toString()}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 60;
                    setPreferences(prev => ({ ...prev, defaultInterviewDuration: value }));
                  }}
                  min="15"
                  max="240"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自动安排后续面试</Label>
                  <p className="text-sm text-muted-foreground">面试结束后自动安排下一轮</p>
                </div>
                <Switch
                  checked={preferences.autoScheduleFollowups}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoScheduleFollowups: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>决策需要审批</Label>
                  <p className="text-sm text-muted-foreground">录用决策需要上级审批</p>
                </div>
                <Switch
                  checked={preferences.requireApprovalForDecisions}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, requireApprovalForDecisions: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 自定义设置 */}
        <Card>
          <CardHeader>
            <CardTitle>自定义设置</CardTitle>
            <CardDescription>
              个性化您的工作环境
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature">邮件签名</Label>
              <Textarea
                id="signature"
                value={preferences.signature}
                onChange={(e) => setPreferences(prev => ({ ...prev, signature: e.target.value }))}
                placeholder="请输入您的邮件签名..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">个人备注</Label>
              <Textarea
                id="notes"
                value={preferences.notes}
                onChange={(e) => setPreferences(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="记录一些个人备注或提醒..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center pt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            重置为默认
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </div>
    </div>
  );
}