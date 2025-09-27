import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  User,
  GraduationCap,
  Briefcase,
  Star
} from "lucide-react";

interface ResumeAnalysisProps {
  analysis: {
    candidate?: any;
    analysis: {
      summary: string;
      skills: string[];
      experience: number;
      education: string;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };
    parsedData: {
      contactInfo: {
        name?: string;
        email?: string;
        phone?: string;
      };
      skills: string[];
      experience: number;
      metadata: {
        pages: number;
      };
    };
  };
}

export function ResumeAnalysis({ analysis }: ResumeAnalysisProps) {
  const { analysis: aiAnalysis, parsedData } = analysis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>AI Resume Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed insights and recommendations
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contact Information */}
      <Card data-testid="card-contact-info">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Contact Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium" data-testid="text-parsed-name">
                {parsedData.contactInfo.name || "Not detected"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium" data-testid="text-parsed-email">
                {parsedData.contactInfo.email || "Not detected"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium" data-testid="text-parsed-phone">
                {parsedData.contactInfo.phone || "Not detected"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card data-testid="card-ai-summary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>AI Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed" data-testid="text-ai-summary">
            {aiAnalysis.summary}
          </p>
        </CardContent>
      </Card>

      {/* Experience and Education */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-experience">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="w-5 h-5" />
              <span>Experience</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold text-primary" data-testid="text-experience-years">
                {aiAnalysis.experience}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Years</p>
                <p className="text-sm text-foreground">Total Experience</p>
              </div>
            </div>
            {parsedData.experience > 0 && parsedData.experience !== aiAnalysis.experience && (
              <p className="text-xs text-muted-foreground mt-2">
                Parsed: {parsedData.experience} years (AI detected: {aiAnalysis.experience} years)
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-education">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5" />
              <span>Education</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground" data-testid="text-education">
              {aiAnalysis.education}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      <Card data-testid="card-skills">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Skills Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">AI Detected Skills</p>
            <div className="flex flex-wrap gap-2">
              {aiAnalysis.skills.map((skill, index) => (
                <Badge key={index} variant="default" data-testid={`badge-ai-skill-${index}`}>
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {parsedData.skills.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Pattern Matched Skills</p>
              <div className="flex flex-wrap gap-2">
                {parsedData.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" data-testid={`badge-parsed-skill-${index}`}>
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-strengths">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Strengths</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiAnalysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2" data-testid={`text-strength-${index}`}>
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="card-weaknesses">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Areas for Improvement</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiAnalysis.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start space-x-2" data-testid={`text-weakness-${index}`}>
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card data-testid="card-recommendations">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-600">
            <TrendingUp className="w-5 h-5" />
            <span>Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {aiAnalysis.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start space-x-2" data-testid={`text-recommendation-${index}`}>
                <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{recommendation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Document Info */}
      <Card data-testid="card-document-info">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Document Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Pages</p>
              <p className="font-medium" data-testid="text-pages">
                {parsedData.metadata.pages}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Processing Status</p>
              <p className="font-medium text-green-600">Successfully Analyzed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
