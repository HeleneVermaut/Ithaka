/**
 * Emoji Data for EmojiPicker Component
 *
 * This file contains a curated list of commonly used emojis
 * organized by categories for easy browsing and selection.
 *
 * Each emoji entry includes:
 * - unicode: The actual emoji character
 * - name: Human-readable name for search functionality
 * - keywords: Additional search terms
 * - category: Group classification
 */

/**
 * Type definition for emoji category keys
 */
export type EmojiCategory = 'smileys' | 'nature' | 'food' | 'travel' | 'objects' | 'symbols'

/**
 * Interface for a single emoji entry
 */
export interface Emoji {
  /** The actual emoji character (unicode) */
  unicode: string

  /** Human-readable name for display and search */
  name: string

  /** Additional keywords for search functionality */
  keywords: string[]

  /** Category grouping */
  category: EmojiCategory
}

/**
 * Complete emoji database organized by category
 *
 * Contains 200+ commonly used emojis across 6 categories
 */
export const emojiDatabase: Emoji[] = [
  // ========================================
  // SMILEYS & EMOTION (50 emojis)
  // ========================================
  { unicode: '😀', name: 'Grinning Face', keywords: ['happy', 'smile', 'joy'], category: 'smileys' },
  { unicode: '😃', name: 'Grinning Face with Big Eyes', keywords: ['happy', 'smile', 'excited'], category: 'smileys' },
  { unicode: '😄', name: 'Grinning Face with Smiling Eyes', keywords: ['happy', 'smile', 'joy'], category: 'smileys' },
  { unicode: '😁', name: 'Beaming Face with Smiling Eyes', keywords: ['happy', 'smile', 'grin'], category: 'smileys' },
  { unicode: '😆', name: 'Grinning Squinting Face', keywords: ['laugh', 'happy', 'smile'], category: 'smileys' },
  { unicode: '😅', name: 'Grinning Face with Sweat', keywords: ['nervous', 'sweat', 'smile'], category: 'smileys' },
  { unicode: '🤣', name: 'Rolling on the Floor Laughing', keywords: ['laugh', 'lol', 'rofl'], category: 'smileys' },
  { unicode: '😂', name: 'Face with Tears of Joy', keywords: ['laugh', 'cry', 'happy'], category: 'smileys' },
  { unicode: '🙂', name: 'Slightly Smiling Face', keywords: ['smile', 'content'], category: 'smileys' },
  { unicode: '🙃', name: 'Upside-Down Face', keywords: ['silly', 'sarcasm'], category: 'smileys' },
  { unicode: '😉', name: 'Winking Face', keywords: ['wink', 'flirt'], category: 'smileys' },
  { unicode: '😊', name: 'Smiling Face with Smiling Eyes', keywords: ['happy', 'blush', 'smile'], category: 'smileys' },
  { unicode: '😇', name: 'Smiling Face with Halo', keywords: ['angel', 'innocent'], category: 'smileys' },
  { unicode: '🥰', name: 'Smiling Face with Hearts', keywords: ['love', 'hearts', 'affection'], category: 'smileys' },
  { unicode: '😍', name: 'Smiling Face with Heart-Eyes', keywords: ['love', 'hearts', 'adore'], category: 'smileys' },
  { unicode: '🤩', name: 'Star-Struck', keywords: ['stars', 'amazed', 'wow'], category: 'smileys' },
  { unicode: '😘', name: 'Face Blowing a Kiss', keywords: ['kiss', 'love', 'heart'], category: 'smileys' },
  { unicode: '😗', name: 'Kissing Face', keywords: ['kiss', 'lips'], category: 'smileys' },
  { unicode: '😙', name: 'Kissing Face with Smiling Eyes', keywords: ['kiss', 'smile'], category: 'smileys' },
  { unicode: '😚', name: 'Kissing Face with Closed Eyes', keywords: ['kiss', 'love'], category: 'smileys' },
  { unicode: '☺️', name: 'Smiling Face', keywords: ['happy', 'smile', 'content'], category: 'smileys' },
  { unicode: '🤗', name: 'Hugging Face', keywords: ['hug', 'embrace'], category: 'smileys' },
  { unicode: '🤔', name: 'Thinking Face', keywords: ['think', 'hmm', 'wonder'], category: 'smileys' },
  { unicode: '🤨', name: 'Face with Raised Eyebrow', keywords: ['skeptical', 'doubt'], category: 'smileys' },
  { unicode: '😐', name: 'Neutral Face', keywords: ['neutral', 'meh'], category: 'smileys' },
  { unicode: '😑', name: 'Expressionless Face', keywords: ['blank', 'expressionless'], category: 'smileys' },
  { unicode: '😶', name: 'Face Without Mouth', keywords: ['silent', 'speechless'], category: 'smileys' },
  { unicode: '😏', name: 'Smirking Face', keywords: ['smirk', 'confident'], category: 'smileys' },
  { unicode: '😒', name: 'Unamused Face', keywords: ['unimpressed', 'meh'], category: 'smileys' },
  { unicode: '🙄', name: 'Face with Rolling Eyes', keywords: ['eye roll', 'annoyed'], category: 'smileys' },
  { unicode: '😬', name: 'Grimacing Face', keywords: ['awkward', 'grimace'], category: 'smileys' },
  { unicode: '🤥', name: 'Lying Face', keywords: ['lie', 'pinocchio'], category: 'smileys' },
  { unicode: '😌', name: 'Relieved Face', keywords: ['relief', 'calm'], category: 'smileys' },
  { unicode: '😔', name: 'Pensive Face', keywords: ['sad', 'thoughtful'], category: 'smileys' },
  { unicode: '😪', name: 'Sleepy Face', keywords: ['tired', 'sleep'], category: 'smileys' },
  { unicode: '🤤', name: 'Drooling Face', keywords: ['drool', 'hungry'], category: 'smileys' },
  { unicode: '😴', name: 'Sleeping Face', keywords: ['sleep', 'zzz'], category: 'smileys' },
  { unicode: '😷', name: 'Face with Medical Mask', keywords: ['sick', 'mask', 'ill'], category: 'smileys' },
  { unicode: '🤒', name: 'Face with Thermometer', keywords: ['sick', 'fever'], category: 'smileys' },
  { unicode: '🤕', name: 'Face with Head-Bandage', keywords: ['hurt', 'injury'], category: 'smileys' },
  { unicode: '🤢', name: 'Nauseated Face', keywords: ['sick', 'nausea'], category: 'smileys' },
  { unicode: '🤮', name: 'Face Vomiting', keywords: ['sick', 'vomit'], category: 'smileys' },
  { unicode: '🤧', name: 'Sneezing Face', keywords: ['sick', 'sneeze'], category: 'smileys' },
  { unicode: '😵', name: 'Dizzy Face', keywords: ['dizzy', 'confused'], category: 'smileys' },
  { unicode: '🤯', name: 'Exploding Head', keywords: ['mind blown', 'shocked'], category: 'smileys' },
  { unicode: '🥳', name: 'Partying Face', keywords: ['party', 'celebrate'], category: 'smileys' },
  { unicode: '🥺', name: 'Pleading Face', keywords: ['puppy eyes', 'beg'], category: 'smileys' },
  { unicode: '😢', name: 'Crying Face', keywords: ['sad', 'cry', 'tear'], category: 'smileys' },
  { unicode: '😭', name: 'Loudly Crying Face', keywords: ['cry', 'sob'], category: 'smileys' },
  { unicode: '😤', name: 'Face with Steam From Nose', keywords: ['angry', 'frustrated'], category: 'smileys' },

  // ========================================
  // NATURE & ANIMALS (50 emojis)
  // ========================================
  { unicode: '🐶', name: 'Dog Face', keywords: ['dog', 'puppy', 'pet'], category: 'nature' },
  { unicode: '🐱', name: 'Cat Face', keywords: ['cat', 'kitten', 'pet'], category: 'nature' },
  { unicode: '🐭', name: 'Mouse Face', keywords: ['mouse', 'rodent'], category: 'nature' },
  { unicode: '🐹', name: 'Hamster', keywords: ['hamster', 'pet'], category: 'nature' },
  { unicode: '🐰', name: 'Rabbit Face', keywords: ['rabbit', 'bunny'], category: 'nature' },
  { unicode: '🦊', name: 'Fox', keywords: ['fox', 'animal'], category: 'nature' },
  { unicode: '🐻', name: 'Bear', keywords: ['bear', 'animal'], category: 'nature' },
  { unicode: '🐼', name: 'Panda', keywords: ['panda', 'bear'], category: 'nature' },
  { unicode: '🐨', name: 'Koala', keywords: ['koala', 'australia'], category: 'nature' },
  { unicode: '🐯', name: 'Tiger Face', keywords: ['tiger', 'cat'], category: 'nature' },
  { unicode: '🦁', name: 'Lion', keywords: ['lion', 'cat'], category: 'nature' },
  { unicode: '🐮', name: 'Cow Face', keywords: ['cow', 'farm'], category: 'nature' },
  { unicode: '🐷', name: 'Pig Face', keywords: ['pig', 'farm'], category: 'nature' },
  { unicode: '🐸', name: 'Frog', keywords: ['frog', 'animal'], category: 'nature' },
  { unicode: '🐵', name: 'Monkey Face', keywords: ['monkey', 'animal'], category: 'nature' },
  { unicode: '🐔', name: 'Chicken', keywords: ['chicken', 'bird'], category: 'nature' },
  { unicode: '🐧', name: 'Penguin', keywords: ['penguin', 'bird'], category: 'nature' },
  { unicode: '🐦', name: 'Bird', keywords: ['bird', 'fly'], category: 'nature' },
  { unicode: '🦅', name: 'Eagle', keywords: ['eagle', 'bird'], category: 'nature' },
  { unicode: '🦆', name: 'Duck', keywords: ['duck', 'bird'], category: 'nature' },
  { unicode: '🦉', name: 'Owl', keywords: ['owl', 'bird', 'wise'], category: 'nature' },
  { unicode: '🦇', name: 'Bat', keywords: ['bat', 'night'], category: 'nature' },
  { unicode: '🐺', name: 'Wolf', keywords: ['wolf', 'animal'], category: 'nature' },
  { unicode: '🐗', name: 'Boar', keywords: ['boar', 'pig'], category: 'nature' },
  { unicode: '🐴', name: 'Horse Face', keywords: ['horse', 'animal'], category: 'nature' },
  { unicode: '🦄', name: 'Unicorn', keywords: ['unicorn', 'magical'], category: 'nature' },
  { unicode: '🐝', name: 'Honeybee', keywords: ['bee', 'insect'], category: 'nature' },
  { unicode: '🐛', name: 'Bug', keywords: ['bug', 'insect'], category: 'nature' },
  { unicode: '🦋', name: 'Butterfly', keywords: ['butterfly', 'insect'], category: 'nature' },
  { unicode: '🐌', name: 'Snail', keywords: ['snail', 'slow'], category: 'nature' },
  { unicode: '🐞', name: 'Lady Beetle', keywords: ['ladybug', 'insect'], category: 'nature' },
  { unicode: '🐢', name: 'Turtle', keywords: ['turtle', 'slow'], category: 'nature' },
  { unicode: '🐍', name: 'Snake', keywords: ['snake', 'reptile'], category: 'nature' },
  { unicode: '🦎', name: 'Lizard', keywords: ['lizard', 'reptile'], category: 'nature' },
  { unicode: '🐙', name: 'Octopus', keywords: ['octopus', 'sea'], category: 'nature' },
  { unicode: '🦑', name: 'Squid', keywords: ['squid', 'sea'], category: 'nature' },
  { unicode: '🐠', name: 'Tropical Fish', keywords: ['fish', 'sea'], category: 'nature' },
  { unicode: '🐟', name: 'Fish', keywords: ['fish', 'sea'], category: 'nature' },
  { unicode: '🐬', name: 'Dolphin', keywords: ['dolphin', 'sea'], category: 'nature' },
  { unicode: '🐳', name: 'Spouting Whale', keywords: ['whale', 'sea'], category: 'nature' },
  { unicode: '🐋', name: 'Whale', keywords: ['whale', 'sea'], category: 'nature' },
  { unicode: '🦈', name: 'Shark', keywords: ['shark', 'sea'], category: 'nature' },
  { unicode: '🌸', name: 'Cherry Blossom', keywords: ['flower', 'spring'], category: 'nature' },
  { unicode: '🌺', name: 'Hibiscus', keywords: ['flower', 'tropical'], category: 'nature' },
  { unicode: '🌻', name: 'Sunflower', keywords: ['flower', 'sun'], category: 'nature' },
  { unicode: '🌹', name: 'Rose', keywords: ['flower', 'love'], category: 'nature' },
  { unicode: '🌷', name: 'Tulip', keywords: ['flower', 'spring'], category: 'nature' },
  { unicode: '🌲', name: 'Evergreen Tree', keywords: ['tree', 'nature'], category: 'nature' },
  { unicode: '🌳', name: 'Deciduous Tree', keywords: ['tree', 'nature'], category: 'nature' },
  { unicode: '🌴', name: 'Palm Tree', keywords: ['tree', 'tropical'], category: 'nature' },

  // ========================================
  // FOOD & DRINK (40 emojis)
  // ========================================
  { unicode: '🍎', name: 'Red Apple', keywords: ['apple', 'fruit'], category: 'food' },
  { unicode: '🍊', name: 'Tangerine', keywords: ['orange', 'fruit'], category: 'food' },
  { unicode: '🍋', name: 'Lemon', keywords: ['lemon', 'fruit'], category: 'food' },
  { unicode: '🍌', name: 'Banana', keywords: ['banana', 'fruit'], category: 'food' },
  { unicode: '🍉', name: 'Watermelon', keywords: ['watermelon', 'fruit'], category: 'food' },
  { unicode: '🍇', name: 'Grapes', keywords: ['grapes', 'fruit'], category: 'food' },
  { unicode: '🍓', name: 'Strawberry', keywords: ['strawberry', 'fruit'], category: 'food' },
  { unicode: '🍑', name: 'Peach', keywords: ['peach', 'fruit'], category: 'food' },
  { unicode: '🍒', name: 'Cherries', keywords: ['cherry', 'fruit'], category: 'food' },
  { unicode: '🍍', name: 'Pineapple', keywords: ['pineapple', 'fruit'], category: 'food' },
  { unicode: '🥥', name: 'Coconut', keywords: ['coconut', 'fruit'], category: 'food' },
  { unicode: '🥝', name: 'Kiwi Fruit', keywords: ['kiwi', 'fruit'], category: 'food' },
  { unicode: '🍅', name: 'Tomato', keywords: ['tomato', 'vegetable'], category: 'food' },
  { unicode: '🥑', name: 'Avocado', keywords: ['avocado', 'fruit'], category: 'food' },
  { unicode: '🥕', name: 'Carrot', keywords: ['carrot', 'vegetable'], category: 'food' },
  { unicode: '🌽', name: 'Ear of Corn', keywords: ['corn', 'vegetable'], category: 'food' },
  { unicode: '🥦', name: 'Broccoli', keywords: ['broccoli', 'vegetable'], category: 'food' },
  { unicode: '🥒', name: 'Cucumber', keywords: ['cucumber', 'vegetable'], category: 'food' },
  { unicode: '🍞', name: 'Bread', keywords: ['bread', 'bake'], category: 'food' },
  { unicode: '🥐', name: 'Croissant', keywords: ['croissant', 'bread'], category: 'food' },
  { unicode: '🥖', name: 'Baguette Bread', keywords: ['baguette', 'bread'], category: 'food' },
  { unicode: '🧀', name: 'Cheese Wedge', keywords: ['cheese', 'dairy'], category: 'food' },
  { unicode: '🥚', name: 'Egg', keywords: ['egg', 'breakfast'], category: 'food' },
  { unicode: '🍳', name: 'Cooking', keywords: ['fried egg', 'breakfast'], category: 'food' },
  { unicode: '🥓', name: 'Bacon', keywords: ['bacon', 'breakfast'], category: 'food' },
  { unicode: '🍔', name: 'Hamburger', keywords: ['burger', 'fast food'], category: 'food' },
  { unicode: '🍟', name: 'French Fries', keywords: ['fries', 'fast food'], category: 'food' },
  { unicode: '🍕', name: 'Pizza', keywords: ['pizza', 'fast food'], category: 'food' },
  { unicode: '🌭', name: 'Hot Dog', keywords: ['hot dog', 'fast food'], category: 'food' },
  { unicode: '🥪', name: 'Sandwich', keywords: ['sandwich', 'lunch'], category: 'food' },
  { unicode: '🌮', name: 'Taco', keywords: ['taco', 'mexican'], category: 'food' },
  { unicode: '🌯', name: 'Burrito', keywords: ['burrito', 'mexican'], category: 'food' },
  { unicode: '🍝', name: 'Spaghetti', keywords: ['pasta', 'italian'], category: 'food' },
  { unicode: '🍜', name: 'Steaming Bowl', keywords: ['ramen', 'noodles'], category: 'food' },
  { unicode: '🍲', name: 'Pot of Food', keywords: ['stew', 'soup'], category: 'food' },
  { unicode: '🍱', name: 'Bento Box', keywords: ['bento', 'japanese'], category: 'food' },
  { unicode: '🍣', name: 'Sushi', keywords: ['sushi', 'japanese'], category: 'food' },
  { unicode: '🍰', name: 'Shortcake', keywords: ['cake', 'dessert'], category: 'food' },
  { unicode: '🎂', name: 'Birthday Cake', keywords: ['cake', 'birthday'], category: 'food' },
  { unicode: '🍪', name: 'Cookie', keywords: ['cookie', 'dessert'], category: 'food' },

  // ========================================
  // TRAVEL & PLACES (30 emojis)
  // ========================================
  { unicode: '✈️', name: 'Airplane', keywords: ['plane', 'travel', 'flight'], category: 'travel' },
  { unicode: '🚗', name: 'Automobile', keywords: ['car', 'vehicle'], category: 'travel' },
  { unicode: '🚕', name: 'Taxi', keywords: ['taxi', 'cab'], category: 'travel' },
  { unicode: '🚙', name: 'Sport Utility Vehicle', keywords: ['suv', 'car'], category: 'travel' },
  { unicode: '🚌', name: 'Bus', keywords: ['bus', 'transport'], category: 'travel' },
  { unicode: '🚎', name: 'Trolleybus', keywords: ['trolley', 'bus'], category: 'travel' },
  { unicode: '🚂', name: 'Locomotive', keywords: ['train', 'travel'], category: 'travel' },
  { unicode: '🚆', name: 'Train', keywords: ['train', 'travel'], category: 'travel' },
  { unicode: '🚇', name: 'Metro', keywords: ['metro', 'subway'], category: 'travel' },
  { unicode: '🚊', name: 'Tram', keywords: ['tram', 'transport'], category: 'travel' },
  { unicode: '🚝', name: 'Monorail', keywords: ['monorail', 'train'], category: 'travel' },
  { unicode: '🚲', name: 'Bicycle', keywords: ['bike', 'bicycle'], category: 'travel' },
  { unicode: '🛴', name: 'Kick Scooter', keywords: ['scooter', 'kick'], category: 'travel' },
  { unicode: '🛹', name: 'Skateboard', keywords: ['skateboard', 'sport'], category: 'travel' },
  { unicode: '⛵', name: 'Sailboat', keywords: ['boat', 'sail'], category: 'travel' },
  { unicode: '🚤', name: 'Speedboat', keywords: ['boat', 'speed'], category: 'travel' },
  { unicode: '🛳️', name: 'Passenger Ship', keywords: ['ship', 'cruise'], category: 'travel' },
  { unicode: '⛴️', name: 'Ferry', keywords: ['ferry', 'boat'], category: 'travel' },
  { unicode: '🚁', name: 'Helicopter', keywords: ['helicopter', 'fly'], category: 'travel' },
  { unicode: '🚀', name: 'Rocket', keywords: ['rocket', 'space'], category: 'travel' },
  { unicode: '🛸', name: 'Flying Saucer', keywords: ['ufo', 'alien'], category: 'travel' },
  { unicode: '🏖️', name: 'Beach with Umbrella', keywords: ['beach', 'vacation'], category: 'travel' },
  { unicode: '🏝️', name: 'Desert Island', keywords: ['island', 'tropical'], category: 'travel' },
  { unicode: '🏔️', name: 'Snow-Capped Mountain', keywords: ['mountain', 'snow'], category: 'travel' },
  { unicode: '⛰️', name: 'Mountain', keywords: ['mountain', 'nature'], category: 'travel' },
  { unicode: '🏕️', name: 'Camping', keywords: ['camping', 'tent'], category: 'travel' },
  { unicode: '🏞️', name: 'National Park', keywords: ['park', 'nature'], category: 'travel' },
  { unicode: '🏟️', name: 'Stadium', keywords: ['stadium', 'sports'], category: 'travel' },
  { unicode: '🗼', name: 'Tokyo Tower', keywords: ['tower', 'landmark'], category: 'travel' },
  { unicode: '🗽', name: 'Statue of Liberty', keywords: ['liberty', 'landmark'], category: 'travel' },

  // ========================================
  // OBJECTS (20 emojis)
  // ========================================
  { unicode: '⌚', name: 'Watch', keywords: ['watch', 'time'], category: 'objects' },
  { unicode: '📱', name: 'Mobile Phone', keywords: ['phone', 'mobile'], category: 'objects' },
  { unicode: '💻', name: 'Laptop', keywords: ['computer', 'laptop'], category: 'objects' },
  { unicode: '⌨️', name: 'Keyboard', keywords: ['keyboard', 'typing'], category: 'objects' },
  { unicode: '🖥️', name: 'Desktop Computer', keywords: ['computer', 'desktop'], category: 'objects' },
  { unicode: '🖨️', name: 'Printer', keywords: ['printer', 'print'], category: 'objects' },
  { unicode: '🖱️', name: 'Computer Mouse', keywords: ['mouse', 'computer'], category: 'objects' },
  { unicode: '📷', name: 'Camera', keywords: ['camera', 'photo'], category: 'objects' },
  { unicode: '📹', name: 'Video Camera', keywords: ['video', 'camera'], category: 'objects' },
  { unicode: '🎥', name: 'Movie Camera', keywords: ['movie', 'film'], category: 'objects' },
  { unicode: '📞', name: 'Telephone Receiver', keywords: ['phone', 'call'], category: 'objects' },
  { unicode: '☎️', name: 'Telephone', keywords: ['phone', 'vintage'], category: 'objects' },
  { unicode: '📺', name: 'Television', keywords: ['tv', 'television'], category: 'objects' },
  { unicode: '📻', name: 'Radio', keywords: ['radio', 'music'], category: 'objects' },
  { unicode: '🎵', name: 'Musical Note', keywords: ['music', 'note'], category: 'objects' },
  { unicode: '🎶', name: 'Musical Notes', keywords: ['music', 'notes'], category: 'objects' },
  { unicode: '🎸', name: 'Guitar', keywords: ['guitar', 'music'], category: 'objects' },
  { unicode: '🎹', name: 'Musical Keyboard', keywords: ['keyboard', 'piano'], category: 'objects' },
  { unicode: '🎤', name: 'Microphone', keywords: ['microphone', 'sing'], category: 'objects' },
  { unicode: '🎧', name: 'Headphone', keywords: ['headphones', 'music'], category: 'objects' },

  // ========================================
  // SYMBOLS (20 emojis)
  // ========================================
  { unicode: '❤️', name: 'Red Heart', keywords: ['heart', 'love'], category: 'symbols' },
  { unicode: '💛', name: 'Yellow Heart', keywords: ['heart', 'love'], category: 'symbols' },
  { unicode: '💚', name: 'Green Heart', keywords: ['heart', 'love'], category: 'symbols' },
  { unicode: '💙', name: 'Blue Heart', keywords: ['heart', 'love'], category: 'symbols' },
  { unicode: '💜', name: 'Purple Heart', keywords: ['heart', 'love'], category: 'symbols' },
  { unicode: '🖤', name: 'Black Heart', keywords: ['heart', 'dark'], category: 'symbols' },
  { unicode: '🤍', name: 'White Heart', keywords: ['heart', 'pure'], category: 'symbols' },
  { unicode: '🤎', name: 'Brown Heart', keywords: ['heart', 'brown'], category: 'symbols' },
  { unicode: '💔', name: 'Broken Heart', keywords: ['heart', 'broken'], category: 'symbols' },
  { unicode: '💕', name: 'Two Hearts', keywords: ['hearts', 'love'], category: 'symbols' },
  { unicode: '💖', name: 'Sparkling Heart', keywords: ['heart', 'sparkle'], category: 'symbols' },
  { unicode: '💗', name: 'Growing Heart', keywords: ['heart', 'grow'], category: 'symbols' },
  { unicode: '💘', name: 'Heart with Arrow', keywords: ['heart', 'cupid'], category: 'symbols' },
  { unicode: '⭐', name: 'Star', keywords: ['star', 'favorite'], category: 'symbols' },
  { unicode: '🌟', name: 'Glowing Star', keywords: ['star', 'sparkle'], category: 'symbols' },
  { unicode: '✨', name: 'Sparkles', keywords: ['sparkle', 'shine'], category: 'symbols' },
  { unicode: '💫', name: 'Dizzy', keywords: ['dizzy', 'star'], category: 'symbols' },
  { unicode: '🔥', name: 'Fire', keywords: ['fire', 'hot'], category: 'symbols' },
  { unicode: '💥', name: 'Collision', keywords: ['boom', 'explosion'], category: 'symbols' },
  { unicode: '⚡', name: 'High Voltage', keywords: ['lightning', 'electric'], category: 'symbols' }
]

/**
 * Category metadata for UI display
 */
export const categoryLabels: Record<EmojiCategory, string> = {
  smileys: 'Smileys & Emotion',
  nature: 'Nature & Animals',
  food: 'Food & Drink',
  travel: 'Travel & Places',
  objects: 'Objects',
  symbols: 'Symbols'
}

/**
 * Get all emojis for a specific category
 *
 * @param category - The category to filter by
 * @returns Array of emojis in that category
 */
export function getEmojisByCategory(category: EmojiCategory): Emoji[] {
  return emojiDatabase.filter((emoji) => emoji.category === category)
}

/**
 * Search emojis by name or keywords
 *
 * @param query - Search query string
 * @returns Array of matching emojis
 */
export function searchEmojis(query: string): Emoji[] {
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) {
    return emojiDatabase
  }

  return emojiDatabase.filter((emoji) => {
    // Search in name
    if (emoji.name.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Search in keywords
    return emoji.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
  })
}

/**
 * Get all available categories
 *
 * @returns Array of category keys
 */
export function getAllCategories(): EmojiCategory[] {
  return ['smileys', 'nature', 'food', 'travel', 'objects', 'symbols']
}
