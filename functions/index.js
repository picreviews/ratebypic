const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.createPic = functions.firestore
    .document('ratepics/{id}')
    .onCreate((snap) => {
      // Get an object representing the document
      // e.g. {'name': 'Marie', 'age': 66}
      const newValue = snap.data();

      // access a particular field as you would any JS property
      const userId = newValue.userId;

      console.log('created pic by '+userId);

      db.doc('user_pic_counts/'+userId).set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true });

      return null;
    });

