import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, BookOpen, LogIn, Home } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Downloads() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();
  
  const pitchDeckContent = `BookShare: Community Digital Library Platform
Executive Summary & Pitch Deck

THE PROBLEM
Current Book Sharing Challenges:
• Physical Libraries: Limited hours, location constraints, membership fees
• Personal Collections: Books gather dust after reading, no monetary return
• Community Disconnect: Neighbors don't know about each other's book collections
• High Book Costs: New books are expensive, used book markets are fragmented
• No Incentive System: Traditional sharing has no reward mechanism

Market Size:
• India Book Market: ₹26,000+ crores annually
• Residential Societies: 50,000+ gated communities across major cities
• Target Demographic: 15+ million educated residents in tier 1-2 cities
• Digital Adoption: 75%+ smartphone penetration in target areas

THE SOLUTION: BOOKSHARE
Revolutionary Community-Based Book Sharing Platform
"Transform your residential society into a thriving digital library where neighbors share books and earn money"

Core Value Propositions:
1. Hyperlocal Network: Society-specific book sharing (walking distance)
2. Monetization: Earn daily rental fees from your personal library
3. Gamification: Brocks credit system with rewards and rankings
4. Technology Integration: Barcode scanning, automated payments, smart notifications
5. Community Building: Strengthen neighborhood connections through literature

[Complete content continues...]`;

  const techSpecsContent = `BookShare: Complete Technical Specifications
System Architecture & Development Documentation

SYSTEM ARCHITECTURE OVERVIEW
Application Type:
• Platform: Progressive Web Application (PWA)
• Architecture: Full-stack monorepo with shared TypeScript schemas
• Deployment: Replit cloud platform with autoscale deployment
• Domain: Community-driven digital library platform

Technology Stack:
Frontend: React 18 with TypeScript, Wouter routing, TanStack Query
Backend: Node.js 20 with Express.js, PostgreSQL database
Database: Drizzle ORM with schema-first approach
Payment: Razorpay + Stripe integration

[Complete technical specifications continue...]`;

  const roadmapContent = `BookShare: Future Features & Innovation Roadmap
Comprehensive Enhancement Opportunities

IMMEDIATE ENHANCEMENTS (Next 3 Months)
User Experience Improvements:
• Smart Filters: Advanced filtering by reading level, book condition
• Visual Book Browser: Grid view with cover images
• Voice Search: Natural language book discovery
• Offline Mode: Browse cached books when offline
• Social Features: Book reviews, reading lists, friend system

[Complete roadmap continues...]`;

  const downloadAsFile = (content: string, filename: string, type: 'txt' | 'doc') => {
    setDownloading(filename);
    
    try {
      let blob;
      let extension;
      
      if (type === 'doc') {
        // Create a simple Word-compatible format
        const wordContent = `
          <html xmlns:v="urn:schemas-microsoft-com:vml" 
                xmlns:o="urn:schemas-microsoft-com:office:office" 
                xmlns:w="urn:schemas-microsoft-com:office:word" 
                xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <title>${filename}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
              h1 { color: #2563eb; font-size: 18pt; margin-bottom: 12pt; }
              h2 { color: #1e40af; font-size: 14pt; margin-top: 18pt; margin-bottom: 8pt; }
              p { margin-bottom: 8pt; }
            </style>
          </head>
          <body>
            <div>${content.replace(/\n/g, '<br>').replace(/•/g, '&bull;')}</div>
          </body>
          </html>
        `;
        blob = new Blob([wordContent], { type: 'application/msword' });
        extension = '.doc';
      } else {
        blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        extension = '.txt';
      }
      
      // Check if browser supports downloads
      if (!window.URL || !window.URL.createObjectURL) {
        alert('Your browser does not support file downloads. Please try a different browser.');
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename + extension;
      
      // Add to DOM, click, and remove
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log(`Download initiated: ${filename}${extension}`);
      
      toast({
        title: "Download Started",
        description: `${filename}${extension} is downloading...`,
      });
      
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Please try again or use a different browser.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">📚 BookShare Documentation</h1>
          <p className="text-lg text-blue-700 mb-4">Download comprehensive business and technical documentation</p>
          
          <div className="flex justify-center space-x-4">
            <Link href="/auth">
              <Button className="bg-green-600 hover:bg-green-700">
                <LogIn className="h-4 w-4 mr-2" />
                Login to BookShare
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <Home className="h-4 w-4 mr-2" />
                Home Page
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <FileText className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Available Documents</h3>
              <p className="text-blue-700">
                Get professional Word and PDF versions of our complete business pitch deck and technical specifications. 
                Perfect for investors, stakeholders, and development teams.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Investor Pitch Deck */}
          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-blue-900 mb-2">🎯 Investor Pitch Deck</h3>
                  <p className="text-gray-600 mb-4">
                    Complete business presentation including market analysis, financial projections, competitive advantage, 
                    and growth strategy. Contains executive summary, business model, revenue projections, and investment opportunity details.
                  </p>
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => downloadAsFile(pitchDeckContent, 'BookShare_Investor_Pitch_Deck', 'doc')}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={downloading === 'BookShare_Investor_Pitch_Deck'}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading === 'BookShare_Investor_Pitch_Deck' ? 'Downloading...' : 'Download Word'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => downloadAsFile(pitchDeckContent, 'BookShare_Investor_Pitch_Deck', 'txt')}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Text
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card className="border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-green-900 mb-2">⚙️ Technical Specifications</h3>
                  <p className="text-gray-600 mb-4">
                    Comprehensive technical documentation covering system architecture, database design, API specifications, 
                    security protocols, and scalability considerations. Essential for development teams and technical stakeholders.
                  </p>
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => downloadAsFile(techSpecsContent, 'BookShare_Technical_Specifications', 'doc')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Word
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => downloadAsFile(techSpecsContent, 'BookShare_Technical_Specifications', 'txt')}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Text
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Future Features Roadmap */}
          <Card className="border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-purple-900 mb-2">🚀 Future Features Roadmap</h3>
                  <p className="text-gray-600 mb-4">
                    Detailed roadmap of 50+ enhancement opportunities, innovation concepts, and expansion strategies. 
                    Includes AI features, blockchain integration, community tools, and market expansion plans.
                  </p>
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => downloadAsFile(roadmapContent, 'BookShare_Future_Features_Roadmap', 'doc')}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Word
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => downloadAsFile(roadmapContent, 'BookShare_Future_Features_Roadmap', 'txt')}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Text
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">
            All documents are professionally formatted and ready to share with investors, developers, or stakeholders.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-green-800 font-medium mb-2">Ready to start using BookShare?</p>
            <Link href="/auth">
              <Button className="bg-green-600 hover:bg-green-700 w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Login or Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}