
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile 
  } from "firebase/auth";
  import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    getDocs,
    arrayUnion,
    orderBy,
    serverTimestamp,
    writeBatch
  } from "firebase/firestore";
  import { 
    ref, 
    uploadString, 
    getDownloadURL 
  } from "firebase/storage";
  import { auth, db, storage } from "../firebaseConfig";
  import { User, PackageRequest, RequestStatus, AppNotification } from "../types";
  
  // --- AUTHENTICATION & USER MANAGEMENT ---
  
  export const registerUser = async (regData: any, photoDataUrl: string | null) => {
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, regData.email, regData.password);
      const user = userCredential.user;
  
      let photoURL = "";
  
      // 2. Upload Photo if exists
      if (photoDataUrl) {
        const storageRef = ref(storage, `profile_photos/${user.uid}`);
        await uploadString(storageRef, photoDataUrl, 'data_url');
        photoURL = await getDownloadURL(storageRef);
      }
  
      // 3. Update Auth Profile
      await updateProfile(user, {
        displayName: `${regData.name} ${regData.surname}`,
        photoURL: photoURL
      });
  
      // 4. Create User Document in Firestore
      const newUser: User = {
        id: user.uid,
        name: regData.name,
        surname: regData.surname,
        email: regData.email,
        phone: regData.phone,
        city: regData.city, // Saved specifically for filtering condos
        address: `${regData.street}, ${regData.number}`,
        apartment: `Int. ${regData.apartment}`,
        floor: regData.floor,
        photo: photoURL,
        level: 1,
        rating: 5.0,
        packagesCollected: 0,
        packagesDelegated: 0,
        memberSince: new Date().toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
        neighborsHelped: 0,
        feedbacksReceived: 0
      };
  
      await setDoc(doc(db, "users", user.uid), newUser);
      return newUser;
    } catch (error) {
      throw error;
    }
  };
  
  export const loginUser = async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(auth, email, pass);
  };
  
  export const logoutUser = async () => {
    return await signOut(auth);
  };
  
  export const getUserProfile = async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  };

  export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, data);
  };
  
  // --- NEIGHBORS (USERS) ---
  
  export const subscribeToNeighbors = (currentUser: User, callback: (neighbors: any[]) => void) => {
    // Filter users by the exact same address and city to form a "Condo"
    // Handle case where city might be undefined for legacy users to prevent crash
    
    if (!currentUser || !currentUser.address) {
        callback([]);
        return () => {};
    }

    const constraints = [
        where("address", "==", currentUser.address)
    ];

    if (currentUser.city) {
        constraints.push(where("city", "==", currentUser.city));
    }

    const q = query(collection(db, "users"), ...constraints);

    return onSnapshot(q, (snapshot) => {
      const neighbors: any[] = [];
      snapshot.forEach((doc) => {
        // Exclude self
        if (doc.id !== currentUser.id) {
          const data = doc.data();
          neighbors.push({
            ...data,
            id: doc.id,
            rating: data.rating || 5.0,
            packages: data.packagesCollected || 0,
            // Statuses will be calculated in App.tsx based on Match documents
            outgoingStatus: 'none',
            incomingStatus: 'none'
          });
        }
      });
      callback(neighbors);
    }, (error) => {
        console.error("Error subscribing to neighbors:", error);
        callback([]);
    });
  };

  export const subscribeToLeaderboard = (currentUser: User, callback: (users: User[]) => void) => {
    if (!currentUser || !currentUser.address) {
        callback([]);
        return () => {};
    }

    const constraints = [
        where("address", "==", currentUser.address)
    ];

    if (currentUser.city) {
        constraints.push(where("city", "==", currentUser.city));
    }

    // Ideally we would orderBy "packagesCollected" desc, but Firestore requires a composite index
    // for equality (address) + inequality (packages). To avoid index setup errors for the user,
    // we fetch all neighbors and sort client-side (datasets are small for condos).
    const q = query(collection(db, "users"), ...constraints);

    return onSnapshot(q, (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      
      // Sort client-side by Total Packages (Collected + Delegated) or just Collected
      // Rule: "Score" usually implies activity. Let's use Total Packages.
      users.sort((a, b) => {
          const scoreA = (a.packagesCollected || 0) + (a.packagesDelegated || 0);
          const scoreB = (b.packagesCollected || 0) + (b.packagesDelegated || 0);
          return scoreB - scoreA;
      });

      callback(users);
    });
  };

  // --- MATCHES ---
  
  export const subscribeToMatches = (currentUserId: string, callback: (matches: any[]) => void) => {
    // Recuperiamo TUTTI i match che coinvolgono l'utente, sia come initiator che come target
    // Usiamo il campo 'users' array per farlo con una sola query semplice
    const q = collection(db, "matches");
    
    return onSnapshot(q, (snapshot) => {
        const matches: any[] = [];
        snapshot.forEach((doc) => {
           const data = doc.data();
           if (data.users && data.users.includes(currentUserId)) {
               matches.push({ ...data, id: doc.id });
           }
        });
        callback(matches);
    });
  };

  export const createMatchRequest = async (fromId: string, toId: string) => {
      // STATO 1: X INVIA RICHIESTA A Y
      // Creiamo un documento direzionale: Initiator=X, Target=Y
      // Questo documento gestisce SOLO la fiducia di X verso Y.
      const matchesRef = collection(db, "matches");
      
      // Controllo se esiste già un documento con ESATTAMENTE questa direzione
      const q = query(matchesRef, 
          where("initiator", "==", fromId),
          where("target", "==", toId)
      );
      
      const querySnapshot = await getDocs(q);
      
      let existingMatchId = null;
      if (!querySnapshot.empty) {
          existingMatchId = querySnapshot.docs[0].id;
      }

      if (existingMatchId) {
          // Reset se esisteva (es. rifiutato in precedenza)
          const matchRef = doc(db, "matches", existingMatchId);
          await updateDoc(matchRef, {
              status: 'pending',
              createdAt: new Date().toISOString()
              // Code non generato qui
          });
      } else {
          // Nuovo documento direzionale
          await addDoc(matchesRef, {
              users: [fromId, toId], // Per query generiche
              initiator: fromId,      // Direzione specifica
              target: toId,           // Direzione specifica
              status: 'pending',
              createdAt: new Date().toISOString()
          });
      }
  };

  export const updateMatchStatus = async (matchId: string, status: 'accepted' | 'complete' | 'none', userId?: string) => {
      const matchRef = doc(db, "matches", matchId);
      
      if (status === 'accepted') {
          // STATO 2.1: Y ACCETTA LA RICHIESTA DI X
          // Generazione codice che Y mostrerà a X.
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          await updateDoc(matchRef, { 
              status: 'accepted',
              verificationCode: code
          });
      } 
      else if (status === 'none') {
          // Rifiuto o Cancellazione
          await deleteDoc(matchRef);
      } 
      else if (status === 'complete') {
          // STATO 3: X CONFERMA CODICE DI Y
          // X si fida ora di Y.
          await updateDoc(matchRef, { 
              status: 'complete' 
          });
      }
  };
  
  // --- REQUESTS ---
  
  export const subscribeToRequests = (userId: string, callback: (requests: PackageRequest[]) => void) => {
    // Fetch all requests where user is involved
    const q = collection(db, "requests");
    return onSnapshot(q, (snapshot) => {
      const requests: PackageRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (data.requesterId === userId || data.delegateId === userId) {
            const type = data.requesterId === userId ? 'outgoing' : 'incoming';
            requests.push({ ...data, id: doc.id, type } as PackageRequest);
        }
      });
      callback(requests);
    });
  };
  
  export const createPackageRequest = async (request: Omit<PackageRequest, 'id' | 'type'>) => {
    await addDoc(collection(db, "requests"), request);
  };
  
  export const updateRequestStatus = async (requestId: string, status: RequestStatus) => {
    const reqRef = doc(db, "requests", requestId);
    await updateDoc(reqRef, { status });
  };

  export const updateRequestDetails = async (requestId: string, details: Partial<PackageRequest>) => {
    const reqRef = doc(db, "requests", requestId);
    await updateDoc(reqRef, details);
  };
  
  export const deletePackageRequest = async (requestId: string) => {
    await deleteDoc(doc(db, "requests", requestId));
  };

  // --- REAL-TIME MESSAGING ---

  export const getChatId = (uid1: string, uid2: string) => {
      return [uid1, uid2].sort().join("_");
  };

  // New function to list all active chats for the current user
  export const subscribeToActiveChats = (userId: string, callback: (chats: any[]) => void) => {
      const chatsRef = collection(db, "chats");
      // Find chats where user is a participant
      const q = query(chatsRef, where("participants", "array-contains", userId));
      
      return onSnapshot(q, (snapshot) => {
          const chats = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          }));
          // Sort client-side if needed, or create composite index for orderBy("lastMessageTime")
          chats.sort((a: any, b: any) => {
              const tA = a.lastMessageTime?.seconds || 0;
              const tB = b.lastMessageTime?.seconds || 0;
              return tB - tA;
          });
          callback(chats);
      });
  };

  export const subscribeToMessages = (chatId: string, callback: (messages: any[]) => void) => {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));
      
      return onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          }));
          callback(msgs);
      });
  };

  export const sendMessage = async (chatId: string, senderId: string, content: string) => {
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
          senderId,
          content,
          createdAt: serverTimestamp(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      });

      // Update the chat metadata
      const chatRef = doc(db, "chats", chatId);
      await setDoc(chatRef, {
          lastMessage: content,
          lastMessageTime: serverTimestamp(),
          participants: chatId.split("_")
      }, { merge: true });
  };

  // --- REAL-TIME NOTIFICATIONS ---

  export const subscribeToNotifications = (userId: string, callback: (notifs: AppNotification[]) => void) => {
      const notifsRef = collection(db, "users", userId, "notifications");
      // Order by timestamp desc
      const q = query(notifsRef, orderBy("createdAt", "desc"));

      return onSnapshot(q, (snapshot) => {
          const notifications = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          })) as AppNotification[];
          callback(notifications);
      });
  };

  export const sendNotification = async (targetUserId: string, notification: Pick<AppNotification, 'title' | 'message' | 'type'>) => {
      const notifsRef = collection(db, "users", targetUserId, "notifications");
      await addDoc(notifsRef, {
          ...notification,
          isRead: false,
          time: 'Adesso', // Or use serverTimestamp and format on client
          createdAt: serverTimestamp() 
      });
  };

  export const markNotificationsAsRead = async (userId: string, notificationIds: string[]) => {
      const batch = writeBatch(db);
      notificationIds.forEach(id => {
          const ref = doc(db, "users", userId, "notifications", id);
          batch.update(ref, { isRead: true });
      });
      await batch.commit();
  };

  export const deleteNotification = async (userId: string, notificationId: string) => {
      const ref = doc(db, "users", userId, "notifications", notificationId);
      await deleteDoc(ref);
  };

  export const deleteAllNotifications = async (userId: string) => {
      const notifsRef = collection(db, "users", userId, "notifications");
      const snapshot = await getDocs(notifsRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
      });
      await batch.commit();
  };
