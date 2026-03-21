import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Crown } from "lucide-react";
import { useLocation } from "wouter";
import EnhancedLeaderboard from "@/components/brocks/enhanced-leaderboard";

export default function LeaderboardPage() {
  const [, navigate] = useLocation();

  const { data: brocksLeaderboard, isLoading } = useQuery({
    queryKey: ["/api/brocks/leaderboard"],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white opacity-90 hover:opacity-100"
            onClick={() => navigate("/")}
            data-testid="leaderboard-back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Brocks Leaderboard</h1>
            <p className="text-sm opacity-90">
              Community rankings by Brocks credits earned
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Content */}
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Full Rankings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading rankings...</div>
              </div>
            ) : brocksLeaderboard && (brocksLeaderboard as any[])?.length > 0 ? (
              <EnhancedLeaderboard leaderboard={brocksLeaderboard as any[]} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No ranking data available yet.</p>
                <p className="text-sm mt-1">Start earning Brocks credits to appear on the leaderboard!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}