import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Award, Zap, Star, Medal } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  userId: number;
  name: string;
  credits: number;
  totalEarned: number;
}

interface EnhancedLeaderboardProps {
  leaderboard: LeaderboardUser[];
}

const getBrocksRank = (credits: number) => {
  if (credits >= 10000) return { 
    name: "Brock Emperor", 
    icon: "⚡", 
    color: "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
    description: "The ultimate Brock master"
  };
  if (credits >= 5000) return { 
    name: "Brock Champion", 
    icon: "🏆", 
    color: "bg-red-500 text-white",
    description: "Elite book sharing champion"
  };
  if (credits >= 1000) return { 
    name: "Brock Legend", 
    icon: "👑", 
    color: "bg-amber-500 text-white",
    description: "Legendary community member"
  };
  if (credits >= 500) return { 
    name: "Brock Master", 
    icon: "🎓", 
    color: "bg-purple-500 text-white",
    description: "Advanced book curator"
  };
  if (credits >= 100) return { 
    name: "Brock Scholar", 
    icon: "📚", 
    color: "bg-blue-500 text-white",
    description: "Dedicated book lover"
  };
  return { 
    name: "Brock Explorer", 
    icon: "🌱", 
    color: "bg-gray-500 text-white",
    description: "New to the journey"
  };
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2: return <Trophy className="w-6 h-6 text-gray-400" />;
    case 3: return <Medal className="w-6 h-6 text-amber-600" />;
    default: return <Award className="w-5 h-5 text-gray-400" />;
  }
};

const getPositionBadge = (rank: number) => {
  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
  if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
  if (rank === 3) return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
  return "bg-gray-100 text-gray-700";
};

export default function EnhancedLeaderboard({ leaderboard }: EnhancedLeaderboardProps) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>Brocks Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No ranking data available yet.</p>
            <p className="text-sm">Start earning Brocks to appear on the leaderboard!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>Brocks Champions</span>
          <Badge variant="secondary" className="ml-auto">
            Top {leaderboard.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {leaderboard.map((user, index) => {
          const brocksRank = getBrocksRank(user.credits);
          const isTopThree = user.rank <= 3;
          
          return (
            <div
              key={user.userId}
              className={`p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                isTopThree 
                  ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                {/* Rank Position */}
                <div className="flex flex-col items-center sm:items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getPositionBadge(user.rank)}`}>
                    {user.rank <= 3 ? getRankIcon(user.rank) : user.rank}
                  </div>
                  {isTopThree && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {user.rank === 1 ? "GOLD" : user.rank === 2 ? "SILVER" : "BRONZE"}
                    </Badge>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-900 text-lg truncate">{user.name}</h4>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="text-lg">{brocksRank.icon}</span>
                      <Badge className={`${brocksRank.color} text-xs`}>
                        {brocksRank.name}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{brocksRank.description}</p>
                  
                  <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4 justify-center sm:justify-start">
                      <div className="text-center">
                        <div className="text-xl font-bold text-amber-600">{user.credits.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Current Brocks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{user.totalEarned.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Total Earned</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Effects for Top 3 */}
              {user.rank === 1 && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full text-sm font-medium">
                    <Crown className="w-4 h-4" />
                    <span>Overall Champion</span>
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Achievement Unlock Hint */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold text-blue-900 mb-1">Climb the Leaderboard!</h4>
            <p className="text-sm text-blue-700">
              Earn Brocks by adding books, borrowing, lending, and referring friends to unlock exclusive ranks and badges!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}