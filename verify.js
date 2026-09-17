process.env.JWT_SECRET = 'x'.repeat(40);
const jwt = require('jsonwebtoken');
const results = [];
const check = (l, c, d='') => results.push(`${c?'PASS':'FAIL'}  ${l}${d?' — '+d:''}`);

/* ---------- 1. Model validation (validateSync needs no DB) ---------- */
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/User');

let e = new Product({}).validateSync();
check('Product requires name/description/price/image',
  ['name','description','basePrice','imageUrl'].every(f => e.errors[f]));

e = new Product({ name:'X', description:'d', basePrice:-5, imageUrl:'u' }).validateSync();
check('Product rejects negative price', !!e.errors.basePrice);

e = new Product({ name:'X', description:'d', basePrice:1000, imageUrl:'u', category:'bogus' }).validateSync();
check('Product rejects invalid category', !!e.errors.category);

e = new Product({ name:'X', description:'d', basePrice:1000, imageUrl:'u', category:'wedding' }).validateSync();
check('Product accepts a valid doc', !e);

e = new Order({}).validateSync();
check('Order requires customer + fulfilment + items',
  !!(e.errors['customer.name'] && e.errors['customer.phone'] && e.errors['fulfilment.method']));

e = new Order({ customer:{name:'A',phone:'1',email:'not-an-email'} }).validateSync();
check('Order rejects malformed email', !!e.errors['customer.email']);

e = new Order({ reference:'R', customer:{name:'A',phone:'1',email:'a@b.com'},
  fulfilment:{method:'pickup',date:new Date(),timeWindow:'am'},
  items:[], subtotal:0, total:0 }).validateSync();
check('Order rejects an empty basket', !!e.errors.items);

const u = new User({ name:'A', email:'A@B.COM', passwordHash:'h', role:'admin' });
check('User lowercases email', u.email === 'a@b.com');
check('User.toSafeObject hides the hash',
  !('passwordHash' in u.toSafeObject()) && u.toSafeObject().role === 'admin');

e = new User({ name:'A', email:'nope', passwordHash:'h' }).validateSync();
check('User rejects bad email', !!e.errors.email);

e = new User({ name:'A', email:'a@b.com', passwordHash:'h', role:'superuser' }).validateSync();
check('User rejects unknown role', !!e.errors.role);

check('User defaults to staff, not admin',
  new User({ name:'A', email:'a@b.com', passwordHash:'h' }).role === 'staff');

/* ---------- 2. Auth middleware / RBAC ---------- */
const { requireRole, signToken } = require('./middleware/auth');

function fakeRes() {
  return { code:null, payload:null, cleared:false,
    status(c){ this.code=c; return this; },
    json(p){ this.payload=p; return this; },
    clearCookie(){ this.cleared=true; } };
}

let res = fakeRes(); let nextCalled = false;
requireRole('admin')({ user:{ role:'staff' } }, res, () => { nextCalled = true; });
check('requireRole blocks staff from admin-only', res.code === 403 && !nextCalled);

res = fakeRes(); nextCalled = false;
requireRole('admin')({ user:{ role:'admin' } }, res, () => { nextCalled = true; });
check('requireRole lets admin through', nextCalled && res.code === null);

res = fakeRes(); nextCalled = false;
requireRole('admin','staff')({ user:{ role:'staff' } }, res, () => { nextCalled = true; });
check('requireRole supports multiple roles', nextCalled);

res = fakeRes(); nextCalled = false;
requireRole('admin')({}, res, () => { nextCalled = true; });
check('requireRole blocks when no user', res.code === 403 && !nextCalled);

const tok = signToken({ _id:'abc123', role:'admin' });
const decoded = jwt.verify(tok, process.env.JWT_SECRET);
check('signToken embeds id + role', decoded.id === 'abc123' && decoded.role === 'admin');
check('token carries an expiry', typeof decoded.exp === 'number');

let tampered = false;
try { jwt.verify(tok, 'wrong-secret'); } catch { tampered = true; }
check('token rejected under a different secret', tampered);

/* ---------- 3. Route wiring ---------- */
function routesOf(router) {
  const out = [];
  router.stack.forEach(l => {
    if (l.route) Object.keys(l.route.methods).forEach(m => out.push(m.toUpperCase()+' '+l.route.path));
  });
  return out;
}
const adminR = routesOf(require('./routes/adminRoutes'));
const authR  = routesOf(require('./routes/authRoutes'));
const prodR  = routesOf(require('./routes/productRoutes'));
const ordR   = routesOf(require('./routes/orderRoutes'));

check('admin exposes product CRUD',
  ['POST /products','PUT /products/:id','DELETE /products/:id','PATCH /products/:id/availability']
    .every(r => adminR.includes(r)), adminR.join(', '));
check('admin exposes orders + stats',
  adminR.includes('GET /orders') && adminR.includes('GET /stats'));
check('auth exposes login/logout/me', ['POST /login','POST /logout','GET /me'].every(r=>authR.includes(r)));
check('public catalog is read-only',
  prodR.includes('GET /') && prodR.includes('GET /:slug') &&
  !prodR.some(r => r.startsWith('POST') || r.startsWith('DELETE')), prodR.join(', '));
check('orders endpoint exists', ordR.includes('POST /'));

// adminRoutes must apply requireAuth to everything via router.use
const adminRouter = require('./routes/adminRoutes');
const hasGuard = adminRouter.stack.some(l => !l.route && l.handle && l.handle.name === 'requireAuth');
check('every admin route sits behind requireAuth', hasGuard);

/* ---------- 4. Upload constraints ---------- */
const { upload } = require('./middleware/upload');
check('upload caps file size at 8MB', upload.limits.fileSize === 8*1024*1024);
check('upload allows up to eight files', upload.limits.files === 8);

console.log('\n' + results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
