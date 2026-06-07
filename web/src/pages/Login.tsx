import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Cloud, Users, Lock, ArrowRight, Loader } from 'lucide-react'
import { authApi } from '../api/client'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: authInfo, isLoading: authInfoLoading } = useQuery({
    queryKey: ['auth', 'info'],
    queryFn: authApi.info,
  })

  useEffect(() => {
    // Check if user is already authenticated via the auth/me endpoint
    const checkAuth = async () => {
      try {
        const user = await authApi.me()
        if (user && user.email && user.email !== 'anonymous') {
          // User is already authenticated, redirect to dashboard
          window.location.href = '/'
        }
      } catch {
        // Not authenticated, stay on login page
      }
    }
    checkAuth()
  }, [])

  const handleCloudflareLogin = () => {
    if (!authInfo?.team_domain) {
      setError('Cloudflare team domain not configured. Please contact your administrator.')
      return
    }

    setLoading(true)
    // Redirect to Cloudflare Access login
    const currentUrl = window.location.origin + window.location.pathname
    window.location.href = `https://${authInfo.team_domain}/cdn-cgi/access/login?redirect_url=${encodeURIComponent(currentUrl)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F6821F] to-[#D4661A] shadow-lg mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Tunnel Manager</h1>
          <p className="text-gray-600 dark:text-gray-400">Cloudflare Zero Trust Edition</p>
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 space-y-6">
          {/* Info section */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Cloud className="w-5 h-5 text-[#F6821F] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Secured by Cloudflare</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This application is protected by Cloudflare Zero Trust security.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-[#F6821F] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Organization Access</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sign in with your Cloudflare organization or team account.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#F6821F] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Enterprise Security</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Multi-factor authentication and role-based access control enabled.</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 dark:bg-gray-800" />

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Login button */}
          {authInfoLoading ? (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium text-sm transition-all cursor-not-allowed"
            >
              <Loader className="w-4 h-4 animate-spin" />
              Loading configuration...
            </button>
          ) : authInfo?.enabled ? (
            <button
              onClick={handleCloudflareLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F6821F] hover:bg-[#E6721F] text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  Sign in with Cloudflare
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Development Mode:</strong> Cloudflare Access authentication is disabled. All users have access to this application.
              </p>
            </div>
          )}

          {/* Footer text */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-600">
            Your access is protected by{' '}
            <a href="https://www.cloudflare.com/zero-trust/" target="_blank" rel="noopener noreferrer" className="text-[#F6821F] hover:underline font-medium">
              Cloudflare Zero Trust
            </a>
          </p>
        </div>

        {/* Help section */}
        <div className="mt-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Need help?</strong> If you don't have access, contact your organization administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
