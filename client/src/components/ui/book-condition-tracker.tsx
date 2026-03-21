import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Star, 
  Camera, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  User
} from "lucide-react";

interface ConditionReport {
  id: number;
  bookId: number;
  userId: number;
  userName: string;
  condition: "New" | "Like New" | "Good" | "Fair" | "Poor";
  rating: number;
  notes: string;
  photos: string[];
  reportType: "initial" | "pre_rental" | "post_rental" | "damage_report";
  createdAt: string;
}

interface BookConditionTrackerProps {
  bookId: number;
  currentCondition: string;
  conditionHistory: ConditionReport[];
  canReportCondition: boolean;
  onReportCondition: (report: Partial<ConditionReport>) => void;
}

export default function BookConditionTracker({
  bookId,
  currentCondition,
  conditionHistory,
  canReportCondition,
  onReportCondition
}: BookConditionTrackerProps) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [newReport, setNewReport] = useState({
    condition: currentCondition,
    rating: 5,
    notes: "",
    reportType: "post_rental" as const
  });

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "New": return "bg-green-600";
      case "Like New": return "bg-green-500";
      case "Good": return "bg-yellow-500";
      case "Fair": return "bg-orange-500";
      case "Poor": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case "New":
      case "Like New": return <CheckCircle className="w-4 h-4" />;
      case "Good": return <Star className="w-4 h-4" />;
      case "Fair": return <Clock className="w-4 h-4" />;
      case "Poor": return <AlertTriangle className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const handleSubmitReport = () => {
    onReportCondition({
      bookId,
      ...newReport
    });
    setShowReportForm(false);
    setNewReport({
      condition: currentCondition,
      rating: 5,
      notes: "",
      reportType: "post_rental"
    });
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Current Condition Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Book Condition</span>
            <Badge className={`${getConditionColor(currentCondition)} text-white`}>
              {getConditionIcon(currentCondition)}
              <span className="ml-1">{currentCondition}</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Rating</span>
              <div className="flex items-center space-x-1">
                {renderStars(Math.round(conditionHistory.reduce((acc, report) => acc + report.rating, 0) / Math.max(conditionHistory.length, 1)))}
                <span className="text-sm text-gray-600 ml-2">
                  ({conditionHistory.length} reports)
                </span>
              </div>
            </div>

            {canReportCondition && !showReportForm && (
              <Button
                onClick={() => setShowReportForm(true)}
                variant="outline"
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Report Current Condition
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Form */}
      {showReportForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Report Book Condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={newReport.condition}
                  onValueChange={(value) => setNewReport(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Like New">Like New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Overall Rating</Label>
                <div className="flex items-center space-x-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReport(prev => ({ ...prev, rating: star }))}
                      className="p-1"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= newReport.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="report-notes">Notes (Optional)</Label>
              <Textarea
                id="report-notes"
                placeholder="Describe the book's condition, any damage, or other relevant details..."
                value={newReport.notes}
                onChange={(e) => setNewReport(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => setShowReportForm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReport}
                className="flex-1"
              >
                Submit Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condition History */}
      <Card>
        <CardHeader>
          <CardTitle>Condition History</CardTitle>
        </CardHeader>
        <CardContent>
          {conditionHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No condition reports yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conditionHistory.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">{report.userName}</span>
                      <Badge
                        variant="outline"
                        className={`${getConditionColor(report.condition)} text-white border-0`}
                      >
                        {report.condition}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {renderStars(report.rating)}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {report.notes && (
                    <p className="text-sm text-gray-600 mt-2">{report.notes}</p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {report.reportType.replace('_', ' ')}
                    </Badge>
                    {report.photos && report.photos.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {report.photos.length} photo(s)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Condition Guidelines */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-gray-800">Condition Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <div><strong>New:</strong> Perfect condition, never used</div>
          <div><strong>Like New:</strong> Excellent condition with minimal wear</div>
          <div><strong>Good:</strong> Minor wear, all pages intact</div>
          <div><strong>Fair:</strong> Noticeable wear but fully readable</div>
          <div><strong>Poor:</strong> Significant wear, pages may be damaged</div>
        </CardContent>
      </Card>
    </div>
  );
}