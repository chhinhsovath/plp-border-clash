'use client'

import { useState } from 'react'
import { Eye, EyeOff, Heart, Shield, Globe, Users, AlertCircle } from 'lucide-react'

// Test credentials for demo
const testCredentials = [
  {
    role: 'Admin',
    email: 'admin@hrs.openplp.com',
    password: 'Admin@123',
    access: 'Full administrative access',
    color: '#8b5cf6'
  },
  {
    role: 'Manager',
    email: 'manager@hrs.openplp.com',
    password: 'Manager@123',
    access: 'Manager with elevated privileges',
    color: '#3b82f6'
  },
  {
    role: 'Data Entry',
    email: 'dataentry@hrs.openplp.com',
    password: 'DataEntry@123',
    access: 'Create & edit reports',
    color: '#10b981'
  },
  {
    role: 'Viewer',
    email: 'viewer@hrs.openplp.com',
    password: 'Viewer@123',
    access: 'Read-only access',
    color: '#6b7280'
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
      
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Left Panel */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '50px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
              <Heart size={40} />
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: 'bold',
                marginLeft: '15px'
              }}>HRS Platform</h1>
            </div>
            <h2 style={{ 
              fontSize: '42px', 
              fontWeight: 'bold',
              marginBottom: '20px',
              lineHeight: '1.2'
            }}>Humanitarian Report System</h2>
            <p style={{ 
              fontSize: '18px',
              opacity: 0.9,
              lineHeight: '1.6'
            }}>
              Streamline your humanitarian assessments, reports, and data management in one secure platform.
            </p>
          </div>

          {/* Features */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', alignItems: 'start' }}>
              <Shield size={20} style={{ marginTop: '2px', marginRight: '10px' }} />
              <div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Secure</h3>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>Enterprise-grade security</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'start' }}>
              <Globe size={20} style={{ marginTop: '2px', marginRight: '10px' }} />
              <div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Global</h3>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>Multi-region support</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'start' }}>
              <Users size={20} style={{ marginTop: '2px', marginRight: '10px' }} />
              <div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Collaborative</h3>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>Real-time teamwork</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'start' }}>
              <AlertCircle size={20} style={{ marginTop: '2px', marginRight: '10px' }} />
              <div>
                <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Smart</h3>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>AI-powered insights</p>
              </div>
            </div>
          </div>

          {/* Demo Credentials */}
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '15px',
            padding: '25px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ 
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <AlertCircle size={24} style={{ marginRight: '10px' }} />
              Demo Credentials
            </h3>
            <p style={{ marginBottom: '15px', opacity: 0.9 }}>
              Click any role below to auto-fill the login form:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {testCredentials.map((cred) => (
                <button
                  key={cred.email}
                  onClick={() => handleCredentialClick(cred)}
                  style={{
                    padding: '12px 15px',
                    background: selectedCredential?.email === cred.email 
                      ? 'rgba(255,255,255,0.3)' 
                      : 'rgba(255,255,255,0.1)',
                    border: selectedCredential?.email === cred.email
                      ? '2px solid white'
                      : '2px solid transparent',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = selectedCredential?.email === cred.email 
                      ? 'rgba(255,255,255,0.3)' 
                      : 'rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ 
                        fontWeight: 'bold',
                        fontSize: '16px',
                        marginBottom: '5px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: cred.color,
                          marginRight: '10px',
                          display: 'inline-block'
                        }}></span>
                        {cred.role}
                      </div>
                      <div style={{ fontSize: '13px', opacity: 0.9 }}>
                        {cred.email} • {cred.password}
                      </div>
                    </div>
                    <span style={{ fontSize: '20px' }}>→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div style={{
          flex: 1,
          padding: '50px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '10px',
              color: '#1a1a1a'
            }}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ 
              color: '#666',
              marginBottom: '30px'
            }}>
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Join our humanitarian network'}
            </p>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ 
                        display: 'block',
                        marginBottom: '8px',
                        color: '#333',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required={!isLogin}
                        value={formData.firstName}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '16px',
                          transition: 'border-color 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e5e5'}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ 
                        display: 'block',
                        marginBottom: '8px',
                        color: '#333',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required={!isLogin}
                        value={formData.lastName}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '16px',
                          transition: 'border-color 0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e5e5'}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block',
                      marginBottom: '8px',
                      color: '#333',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Organization (Optional)
                    </label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      placeholder="Your organization name"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e5e5',
                        borderRadius: '8px',
                        fontSize: '16px',
                        transition: 'border-color 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e5e5'}
                    />
                  </div>
                </>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  color: '#333',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e5e5'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  color: '#333',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px',
                      paddingRight: '45px',
                      border: '2px solid #e5e5e5',
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.3s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e5e5'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '5px',
                      color: '#666'
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {!isLogin && (
                  <p style={{ 
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    Min 8 chars with uppercase, lowercase, number & special character
                  </p>
                )}
              </div>

              {message && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  background: message.type === 'success' ? '#10b981' : '#ef4444',
                  color: 'white',
                  fontSize: '14px'
                }}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div style={{
              textAlign: 'center',
              marginTop: '30px',
              paddingTop: '30px',
              borderTop: '1px solid #e5e5e5'
            }}>
              <button
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
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}