/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { _objectWithOptions } = require('firebase-functions/lib/providers/storage');
const { firestore } = require('firebase-admin');
admin.initializeApp();

exports.createUserDatabaseEntry = functions.auth.user().onCreate((u) => {
    const uid = u.uid
    admin.firestore().collection('users').doc(uid).set({
        subbedTo: [],
        status: "online"
    })
})

exports.deleteUserDatabaseEntry = functions.auth.user().onDelete((u) => {
    const uid = u.uid;
    admin.firestore().collection('users').doc(uid).delete();
})

exports.pingQueue = functions.firestore.document('rooms/{docId}')
    .onUpdate((change, context) => {
        const queued = change.after.get('queued');
        const queuedBefore = change.before.get('queued');
        const min = change.after.get('minUserCount');
        if(Object.keys(queued).length == min && (Object.keys(queuedBefore).length < Object.keys(queued).length)) {
            Object.keys(queued).forEach((_, i) => {
                admin.firestore().collection('users').doc(queued[i]).get().then((t) => {
                    tok = t.get("fcmToken")
                    console.log("fcmToken of user ".concat(queued[i]).concat(": ").concat(tok))
                    admin.messaging().sendToDevice(tok, {notification: {title: 'The queue '.concat(context.params.docId).concat(' is ready to play!')}})
                })
            })
        }
    })

exports.pingSubs = functions.firestore.document('rooms/{docId}')
    .onUpdate((change, context) => {
        const queued = change.after.get('queued');
        const queuedBefore = change.before.get('queued');
        const subbed = change.after.get('subbed');
        if(Object.keys(queued).length == 1 && (Object.keys(queuedBefore).length < Object.keys(queued).length)) {
            Object.keys(subbed).forEach((_, i) => {
                admin.firestore().collection('users').doc(subbed[i]).get().then((t) => {
                    tok = t.get("fcmToken")
                    console.log("fcmToken of user ".concat(subbed[i]).concat(": ").concat(tok))
                    admin.messaging().sendToDevice(tok, {notification: {title: 'Someone joined the queue for '.concat(context.params.docId).concat('. Hop in now!')}})
                })
            })
        }
    })