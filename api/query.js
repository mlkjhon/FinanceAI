import { BD } from './db.js';

BD.query(`SELECT * FROM categorias LIMIT 10`)
  .then(res => {
    console.log("categorias:");
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
