import axios from 'axios'

async function testLogin() {
  const loginData = {
    email: 'admin@hrs.openplp.com',
    password: 'Admin@123'
  }
  
  console.log('Testing API login with:', loginData)
  
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('✅ Login successful!')
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error: any) {
    console.log('❌ Login failed!')
    console.log('Status:', error.response?.status)
    console.log('Error:', error.response?.data)
    
    // Log full error for debugging
    if (error.response?.status === 500) {
      console.log('\nFull error response:', error.response.data)
    }
  }
}

testLogin()