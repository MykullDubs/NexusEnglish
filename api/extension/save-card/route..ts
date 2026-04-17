// app/api/extension/save-card/route.ts
import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin securely (ensure your service account JSON is in your env vars)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { term, definition, translation, ipa, source, instructorId } = body;

        // Basic validation
        if (!term || !instructorId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Target a specific "Inbox" deck for this instructor
        // You can query for an existing "Web Imports" deck, or create it if it doesn't exist
        const inboxRef = db.collection('instructors').doc(instructorId).collection('decks').doc('web-inbox');
        
        // Ensure the inbox deck exists
        await inboxRef.set({
            title: 'Web Imports',
            description: 'Cards captured from the Chrome Extension',
            updatedAt: Date.now(),
            isSystemDeck: true // Custom flag to handle this deck specially in your UI
        }, { merge: true });

        // Generate a new card payload
        const newCard = {
            id: `ext_${Date.now()}`,
            term,
            definition: definition || '',
            translation: translation || '',
            ipa: ipa || '',
            source: source || 'Chrome Extension',
            createdAt: Date.now(),
            status: 'draft' // Staged for review
        };

        // Add the card to the subcollection
        await inboxRef.collection('cards').doc(newCard.id).set(newCard);

        return NextResponse.json({ success: true, cardId: newCard.id }, { status: 200 });

    } catch (error: any) {
        console.error('Extension Pipeline Error:', error);
        return NextResponse.json({ error: 'Failed to process card' }, { status: 500 });
    }
}
