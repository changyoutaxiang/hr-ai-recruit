import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/ui/sidebar";
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
        title: t('preferences.toast.savedTitle'),
        description: t('preferences.toast.savedDescription'),
      });
    } catch (error) {
      toast({
        title: t('preferences.toast.saveFailed'),
        description: t('preferences.toast.saveFailedDescription'),
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
      title: t('preferences.toast.resetTitle'),
      description: t('preferences.toast.resetDescription'),
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t('nav.preferences')}</h1>
              <p className="text-sm text-muted-foreground">{t('preferences.subtitle')}</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-4xl">
            <div className="space-y-6">
        {/* 个人信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('preferences.personalInfo.title')}
            </CardTitle>
            <CardDescription>
              {t('preferences.personalInfo.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('preferences.personalInfo.displayName')}</Label>
                <Input
                  id="displayName"
                  value={preferences.displayName}
                  onChange={(e) => setPreferences(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={t('preferences.personalInfo.displayNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('preferences.personalInfo.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={preferences.email}
                  onChange={(e) => setPreferences(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('preferences.personalInfo.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('preferences.personalInfo.phone')}</Label>
                <Input
                  id="phone"
                  value={preferences.phone}
                  onChange={(e) => setPreferences(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={t('preferences.personalInfo.phonePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">{t('preferences.personalInfo.department')}</Label>
                <Input
                  id="department"
                  value={preferences.department}
                  onChange={(e) => setPreferences(prev => ({ ...prev, department: e.target.value }))}
                  placeholder={t('preferences.personalInfo.departmentPlaceholder')}
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
              {t('preferences.notifications.title')}
            </CardTitle>
            <CardDescription>
              {t('preferences.notifications.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.notifications.email')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.notifications.emailDesc')}</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.notifications.push')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.notifications.pushDesc')}</p>
                </div>
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, pushNotifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.notifications.candidateUpdates')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.notifications.candidateUpdatesDesc')}</p>
                </div>
                <Switch
                  checked={preferences.candidateUpdates}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, candidateUpdates: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.notifications.interviewReminders')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.notifications.interviewRemindersDesc')}</p>
                </div>
                <Switch
                  checked={preferences.interviewReminders}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, interviewReminders: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.notifications.systemAlerts')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.notifications.systemAlertsDesc')}</p>
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
              {t('preferences.appearance.title')}
            </CardTitle>
            <CardDescription>
              {t('preferences.appearance.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('preferences.appearance.language')}</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value as Language }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">{t('preferences.appearance.languageZh')}</SelectItem>
                    <SelectItem value="en">{t('preferences.appearance.languageEn')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('preferences.appearance.theme')}</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('preferences.appearance.themeLight')}</SelectItem>
                    <SelectItem value="dark">{t('preferences.appearance.themeDark')}</SelectItem>
                    <SelectItem value="system">{t('preferences.appearance.themeSystem')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('preferences.appearance.timezone')}</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Shanghai">{t('preferences.appearance.timezoneBeijing')}</SelectItem>
                    <SelectItem value="America/New_York">{t('preferences.appearance.timezoneNewYork')}</SelectItem>
                    <SelectItem value="Europe/London">{t('preferences.appearance.timezoneLondon')}</SelectItem>
                    <SelectItem value="Asia/Tokyo">{t('preferences.appearance.timezoneTokyo')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('preferences.appearance.dateFormat')}</Label>
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
              {t('preferences.aiAssistant.title')}
            </CardTitle>
            <CardDescription>
              {t('preferences.aiAssistant.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.aiAssistant.enabled')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.aiAssistant.enabledDesc')}</p>
                </div>
                <Switch
                  checked={preferences.aiAssistantEnabled}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, aiAssistantEnabled: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.aiAssistant.autoGenerateProfiles')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.aiAssistant.autoGenerateProfilesDesc')}</p>
                </div>
                <Switch
                  checked={preferences.autoGenerateProfiles}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoGenerateProfiles: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.aiAssistant.suggestions')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.aiAssistant.suggestionsDesc')}</p>
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
              {t('preferences.workflow.title')}
            </CardTitle>
            <CardDescription>
              {t('preferences.workflow.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('preferences.workflow.defaultInterviewDuration')}</Label>
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
                  <Label>{t('preferences.workflow.autoScheduleFollowups')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.workflow.autoScheduleFollowupsDesc')}</p>
                </div>
                <Switch
                  checked={preferences.autoScheduleFollowups}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoScheduleFollowups: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('preferences.workflow.requireApprovalForDecisions')}</Label>
                  <p className="text-sm text-muted-foreground">{t('preferences.workflow.requireApprovalForDecisionsDesc')}</p>
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
            <CardTitle>{t('preferences.customization.title')}</CardTitle>
            <CardDescription>
              {t('preferences.customization.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature">{t('preferences.customization.signature')}</Label>
              <Textarea
                id="signature"
                value={preferences.signature}
                onChange={(e) => setPreferences(prev => ({ ...prev, signature: e.target.value }))}
                placeholder={t('preferences.customization.signaturePlaceholder')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('preferences.customization.notes')}</Label>
              <Textarea
                id="notes"
                value={preferences.notes}
                onChange={(e) => setPreferences(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('preferences.customization.notesPlaceholder')}
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
                  data-testid="button-reset-preferences"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('preferences.buttons.resetToDefault')}
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                  data-testid="button-save-preferences"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? t('common.saving') : t('preferences.buttons.saveSettings')}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}