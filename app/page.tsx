'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock,
  Building2,
  Heart,
  Globe,
  Users,
  FileText,
  ChevronRight
} from 'lucide-react'

// Test credentials for demo
const testCredentials = [
  {
    role: 'Super Admin',
    email: 'super@hrs.openplp.com',
    password: 'Super@123',
    access: 'Full system control',
    color: 'bg-purple-500'
  },
  {
    role: 'Admin',
    email: 'admin@hrs.openplp.com',
    password: 'Admin@123',
    access: 'Organization management',
    color: 'bg-blue-500'
  },
  {
    role: 'Editor',
    email: 'editor@hrs.openplp.com',
    password: 'Editor@123',
    access: 'Create & edit reports',
    color: 'bg-green-500'
  },
  {
    role: 'Viewer',
    email: 'viewer@hrs.openplp.com',
    password: 'Viewer@123',
    access: 'Read-only access',
    color: 'bg-gray-500'
  }
]

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<typeof testCredentials[0] | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organizationName: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setMessage({ type: 'success', text: isLogin ? 'Login successful!' : 'Registration successful!' })
      
      // Store token
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        
        // Redirect to dashboard after successful auth
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCredentialClick = (credential: typeof testCredentials[0]) => {
    setSelectedCredential(credential)
    setFormData({
      ...formData,
      email: credential.email,
      password: credential.password
    })
    setIsLogin(true)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding and Info */}
        <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-xl mx-auto w-full">
            {/* Logo and Title */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl text-white">
                  <Heart className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">HRS Platform</h1>
                  <p className="text-sm text-gray-600">Humanitarian Report System</p>
                </div>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Empowering Humanitarian Action
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Streamline your humanitarian assessments, reports, and data management in one secure platform.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-red-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Reports</h3>
                  <p className="text-sm text-gray-600">AI-powered analysis</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-red-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Global Reach</h3>
                  <p className="text-sm text-gray-600">Multi-region support</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Secure</h3>
                  <p className="text-sm text-gray-600">Enterprise security</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-red-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Collaborative</h3>
                  <p className="text-sm text-gray-600">Real-time teamwork</p>
                </div>
              </div>
            </div>

            {/* Test Credentials Card */}
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Demo Credentials
                </CardTitle>
                <CardDescription>Click any role to auto-fill login</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {testCredentials.map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => handleCredentialClick(cred)}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                      selectedCredential?.email === cred.email 
                        ? 'border-red-400 bg-white shadow-md' 
                        : 'border-gray-200 bg-white/80 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${cred.color}`}></div>
                        <div>
                          <div className="font-semibold text-sm">{cred.role}</div>
                          <div className="text-xs text-gray-600">{cred.email}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="lg:w-1/2 p-8 lg:p-12 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-xl border-0 bg-white">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-center">
                {isLogin 
                  ? 'Enter your credentials to access your account' 
                  : 'Join our humanitarian network'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            required={!isLogin}
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="pl-9"
                            placeholder="John"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            required={!isLogin}
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="pl-9"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">Organization (Optional)</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="organizationName"
                          name="organizationName"
                          type="text"
                          placeholder="Your organization name"
                          value={formData.organizationName}
                          onChange={handleInputChange}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-9"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-9 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="text-xs text-gray-500">
                      Min 8 chars with uppercase, lowercase, number & special character
                    </p>
                  )}
                </div>

                {message && (
                  <Alert className={message.type === 'success' ? 'border-green-200' : 'border-red-200'}>
                    <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                      {message.text}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600" 
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setMessage(null)
                  setSelectedCredential(null)
                  setFormData({
                    email: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    organizationName: ''
                  })
                }}
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  )
}