"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Users, BookOpen, MessageCircle, RefreshCw, Zap, Heart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function LoginScreen() {
  const { login, isLoading } = useAuth()
  const [showReset, setShowReset] = useState(false)

  const handleMicrosoftLogin = async () => {
    try {
      await login()
    } catch (error: any) {
      console.error("Login failed:", error)

      // Show reset button if interaction_in_progress error
      if (error?.message?.includes('interaction_in_progress') ||
          error?.errorCode === 'interaction_in_progress') {
        setShowReset(true)
      } else {
        alert("Login failed. Please try again.")
      }
    }
  }

  const handleReset = () => {
    try {
      // Clear all MSAL cache
      sessionStorage.clear()
      localStorage.clear()
      console.log('✅ Cache cleared')

      // Reload page
      window.location.reload()
    } catch (error) {
      console.error('Failed to reset:', error)
      alert('Please close and reopen your browser')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 stripe-pattern">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-6 sm:gap-12 items-center">
        {/* Left side - Branding and features */}
        <div className="space-y-6 sm:space-y-8">
          <div className="text-center lg:text-left">
            {/* Title with neo-brutalist styling */}
            <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 bg-primary border-2 border-foreground shadow-brutal">
                <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
                  BERK<span className="text-secondary">CONNECT</span>
                </h1>
                <div className="h-1 sm:h-1.5 bg-secondary mt-1 sm:mt-2" />
              </div>
            </div>

            <p className="text-base sm:text-xl text-muted-foreground leading-relaxed px-2 sm:px-0 font-medium">
              Connect with your school community. Share updates, join clubs, and stay informed about campus life.
            </p>
          </div>

          {/* Feature highlights - Neo-brutalist cards */}
          <div className="hidden sm:grid gap-4">
            {[
              { icon: Users, title: "Connect with Classmates", desc: "Build your school network", rotate: "-1deg" },
              { icon: BookOpen, title: "Join Clubs & Activities", desc: "Discover new interests", rotate: "0.5deg" },
              { icon: MessageCircle, title: "Stay Updated", desc: "Never miss announcements", rotate: "-0.5deg" },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-card border-2 border-foreground shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all cursor-default"
                style={{ transform: `rotate(${feature.rotate})` }}
              >
                <div className="p-2 sm:p-3 bg-secondary border-2 border-foreground flex-shrink-0">
                  <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-card-foreground uppercase tracking-wide">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-brutal-lg transition-all">
            <CardHeader className="text-center space-y-2 sm:space-y-3">
              <div className="mx-auto w-fit">
                <span className="inline-block px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest border-2 border-foreground transform -rotate-2">
                  Go Bucs!
                </span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl">Welcome Back</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Sign in with your school Microsoft account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <Button
                onClick={handleMicrosoftLogin}
                className="w-full h-12 sm:h-14 text-sm sm:text-base"
                size="lg"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
                </svg>
                {isLoading ? "Signing in..." : "Continue with Microsoft"}
              </Button>

              {/* Reset button for stuck auth state */}
              {showReset && (
                <div className="space-y-3">
                  <div className="text-center text-xs sm:text-sm font-bold text-secondary-foreground bg-secondary p-3 border-2 border-foreground">
                    Login stuck? Try resetting the authentication state.
                  </div>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full h-10 sm:h-11"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset & Try Again
                  </Button>
                </div>
              )}

              <div className="text-center border-t-2 border-foreground pt-4">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium px-2">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="fixed bottom-4 left-4 hidden lg:block">
        <div className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground border-2 border-foreground shadow-brutal text-xs font-bold uppercase">
          <Heart className="h-4 w-4" />
            Made with ❤️ aris and BpsCSC
        </div>
      </div>
    </div>
  )
}
