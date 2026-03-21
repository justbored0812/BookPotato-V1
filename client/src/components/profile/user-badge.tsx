import { Badge } from "@/components/ui/badge";
import { Crown, Star, Award, Medal, Trophy } from "lucide-react";

interface UserBadgeProps {
  referralCount: number;
  className?: string;
}

export default function UserBadge({ referralCount, className = "" }: UserBadgeProps) {
  const getBadgeInfo = (count: number) => {
    if (count >= 20) {
      return {
        icon: <Trophy className="w-4 h-4" />,
        label: "Community Legend",
        color: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
        description: "20+ people helped"
      };
    } else if (count >= 10) {
      return {
        icon: <Crown className="w-4 h-4" />,
        label: "Community Champion",
        color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
        description: "10+ people helped"
      };
    } else if (count >= 6) {
      return {
        icon: <Award className="w-4 h-4" />,
        label: "Platinum Helper",
        color: "bg-gradient-to-r from-gray-400 to-gray-600 text-white",
        description: "6+ people helped"
      };
    } else if (count >= 3) {
      return {
        icon: <Medal className="w-4 h-4" />,
        label: "Gold Helper",
        color: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
        description: "3+ people helped"
      };
    } else if (count >= 2) {
      return {
        icon: <Star className="w-4 h-4" />,
        label: "Silver Helper",
        color: "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
        description: "2+ people helped"
      };
    } else if (count >= 1) {
      return {
        icon: <Star className="w-4 h-4" />,
        label: "Helper",
        color: "bg-gradient-to-r from-blue-400 to-blue-600 text-white",
        description: "1 person helped"
      };
    } else {
      return {
        icon: <Star className="w-4 h-4" />,
        label: "New Member",
        color: "bg-gray-200 text-gray-600",
        description: "Welcome to BookShare!"
      };
    }
  };

  const badgeInfo = getBadgeInfo(referralCount);

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <Badge className={`${badgeInfo.color} px-3 py-1 flex items-center space-x-1`}>
        {badgeInfo.icon}
        <span className="font-medium">{badgeInfo.label}</span>
      </Badge>
      <p className="text-xs text-gray-500 text-center">{badgeInfo.description}</p>
    </div>
  );
}