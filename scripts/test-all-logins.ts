import axios from 'axios'

const testAccounts = [
  {
    role: 'Admin',
    email: 'admin@hrs.openplp.com',
    password: 'Admin@123'
  },
  {
    role: 'Manager',
    email: 'manager@hrs.openplp.com',
    password: 'Manager@123'
  },
  {
    role: 'Data Entry',
    email: 'dataentry@hrs.openplp.com',
    password: 'DataEntry@123'
  },
  {
    role: 'Viewer',
    email: 'viewer@hrs.openplp.com',
    password: 'Viewer@123'
  }
]

async function testAllLogins() {
  console.log('Testing all demo account logins...\n')
  
  for (const account of testAccounts) {
    console.log(`Testing ${account.role}:`)
    console.log(`  Email: ${account.email}`)
    console.log(`  Password: ${account.password}`)
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: account.email,
        password: account.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.data.success) {
        console.log(`  ✅ Login successful! Role: ${response.data.data.user.role}`)
      }
    } catch (error: any) {
      console.log(`  ❌ Login failed! Error: ${error.response?.data?.error || error.message}`)
    }
    console.log('')
  }
}

testAllLogins()