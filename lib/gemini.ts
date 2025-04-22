import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { PlaylistSuggestion, Track, PlaylistResponse } from '@/types';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Safety settings to ensure appropriate content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Create a model with specific generation configuration
const getGeminiModel = () => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
    },
  });
  
  return model;
};

/**
 * Function to get a conversational response from Gemini
 */
export const getChatResponse = async (
  message: string,
  chatHistory: { role: 'user' | 'model'; parts: [{text: string}] }[] = []
) => {
  try {
    const model = getGeminiModel();
    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error getting chat response:', error);
    return 'I encountered an error while processing your request. Please try again.';
  }
};

/**
 * Function to generate a playlist suggestion based on the user's query
 */
export const generatePlaylistSuggestion = async (
  userQuery: string,
  accessToken?: string
): Promise<PlaylistResponse> => {
  try {
    const model = getGeminiModel();

    // Create a prompt to generate playlist details in JSON format
    const prompt = `
      You are a music expert who creates personalized playlists based on user requests.
      
      User request: "${userQuery}"
      
      Based on this request, create a playlist that matches the mood, genre, or theme the user is looking for.
      
      Please provide your response in the following JSON format only, without any additional text:
      {
        "playlistName": "Name of the playlist",
        "playlistDescription": "A brief description of the playlist",
        "tracks": [
          {
            "name": "Song Title",
            "artists": [{"name": "Artist Name"}],
            "uri": "spotify:track:XXXX"
          }
        ]
      }
      
      For the track URIs, use realistic-looking Spotify track IDs (24 character alphanumeric strings) in the format spotify:track:XXXX.
      Include 5 tracks (if user not mentioned in request else create how much user requested for) that would fit well in this playlist.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to get a valid playlist suggestion');
    }
    
    const playlistData = JSON.parse(jsonMatch[0]);
    
    const playlistSuggestion: PlaylistSuggestion = {
      name: playlistData.playlistName,
      description: playlistData.playlistDescription,
      tracks: playlistData.tracks,
    };
    
    const message = `Based on your request, I've created a "${playlistSuggestion.name}" playlist. Would you like me to save this to your Spotify account?`;
    
    return {
      message,
      playlistSuggestion,
    };
  } catch (error) {
    console.error('Error generating playlist suggestion:', error);
    return {
      message: 'I encountered an error while creating your playlist. Please try again with a different request.',
    };
  }
};

/**
 * Function to generate a conversational response about music
 */
export const generateConversationResponse = async (
  userMessage: string
): Promise<string> => {
  try {
    const model = getGeminiModel();
    
    // Add context for the model about its role
    const contextualPrompt = `
      You are a helpful music assistant called "Playlist Curator" that specializes in helping users discover music and create playlists.
      
      When users ask for music recommendations or playlists, suggest they try creating a playlist.
      
      Keep your responses conversational, friendly, and focused on music.
      
      User message: ${userMessage}
    `;
    
    const result = await model.generateContent(contextualPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating conversation response:', error);
    return 'I encountered an error while processing your message. Please try again.';
  }
}; 