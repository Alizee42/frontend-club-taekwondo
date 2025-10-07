const bcrypt = require('bcrypt');

const users = [
  { email: 'admin1@club1.com', password: 'motdepasseAdmin1' },
  { email: 'admin2@club2.com', password: 'motdepasseAdmin2' },
  { email: 'admin3@club3.com', password: 'motdepasseAdmin3' },
  { email: 'admin4@club4.com', password: 'motdepasseAdmin4' },
  { email: 'sophie.martin@email.com', password: 'motdepasseParent1' },
  { email: 'parent2@club2.com', password: 'motdepasseParent2' },
  { email: 'parent3@club3.com', password: 'motdepasseParent3' },
  { email: 'parent4@club4.com', password: 'motdepasseParent4' },
  { email: 'jean.dupont@club1.com', password: 'motdepasseMembre1' },
  { email: 'marie.durand@club2.com', password: 'motdepasseMembre2' },
  { email: 'paul.lefevre@club3.com', password: 'motdepasseMembre3' },
  { email: 'julie.moreau@club4.com', password: 'motdepasseMembre4' }
];

const saltRounds = 10;

(async () => {
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, saltRounds);
    console.log(`UPDATE users SET password = '${hash}' WHERE email = '${user.email}';`);
  }
})();