const express = require('express');
const router = express.Router();

router.get('/:id', (req, res) => {
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/) == null) {
    res.status(404).send({message:'error in fetching certificate'});
  } else {
    Cert.findById(req.params.id, (err, myCert) => {
      if (err) {
	console.log(err);
        res.status(404).send({message:'error in fetching certificate'});
      } else {
        // previously it was asking for course and user, but now
        // front end will ask for those in parallel after cert
        if (myCert != null) {
          res.status(200).send(myCert);
        }
      }
    });
  }
});

module.exports = router;
