db.auth('admin', 'adminpassword')

db = db.getSiblingDB('modu')

db.createUser({
  user: 'modu',
  pwd: 'modu123',
  roles: [
    {
      role: 'readWrite',
      db: 'modu'
    }
  ]
}) 