/* Date Me — built-in idea library.
 *
 * Every idea is one line. Short keys keep the file readable; anything left
 * out falls back to the default in Engine.normalize().
 *
 *   t      title                    e     emoji
 *   cat    colour theme: food | outdoors | active | culture | home | seasonal | adventure | night
 *   d      one-sentence description
 *   c      cost 0 free, 1 $, 2 $$, 3 $$$
 *   m      minutes it takes
 *   io     'in' | 'out' | 'mix'
 *   act    0 low-key .. 10 very active          (default 3)
 *   adv    0 chill .. 10 adventurous            (default 3)
 *   crowd  0 quiet .. 10 packed                 (default 4)
 *   food   0 not about food .. 10 all about food (default 0)
 *   tr     travel: 0 at home, 1 close by, 2 short drive, 3 road trip (default 1)
 *   w      times of day it works: m morning, a afternoon, e evening, n late night (default 'aen')
 *   int    interests it suits: artsy sporty nerdy musical outdoorsy gamer animals cars books fashion cooking theater
 *   love   love languages it speaks: time words gifts acts touch
 *   s      seasons it only works in: sp su fa wi (leave out = any season)
 *   need   place features required: lake coast beach mountains trails river hotspring ski snow city
 *   fd     foods involved (hidden if they dislike any): seafood sushi spicy meat dairy gluten sweets coffee
 *   age    minimum age (alcohol ideas are 21)
 */
(function () {
  const IDEAS = [
    // ---------- FOOD ----------
    { t: "Taco truck crawl", e: "🌮", cat: "food", d: "Hit three taco trucks, split one taco at each, and crown a winner.", c: 1, m: 120, io: "mix", food: 9, adv: 4, crowd: 5, w: "aen", fd: ["spicy", "meat"] },
    { t: "Sushi night", e: "🍣", cat: "food", d: "Order a few rolls you've never tried and rate each one out of ten.", c: 2, m: 90, io: "in", food: 8, adv: 4, crowd: 5, w: "en", fd: ["sushi", "seafood"] },
    { t: "Homemade pizza night", e: "🍕", cat: "food", d: "Each of you builds a pizza with secret toppings, then trade slices.", c: 1, m: 120, io: "in", tr: 0, food: 7, crowd: 0, w: "ae", int: ["artsy", "cooking"], love: ["acts", "time"], fd: ["gluten", "dairy"] },
    { t: "Bakery crawl", e: "🥐", cat: "food", d: "Three bakeries, one pastry each, and a very serious ranking.", c: 1, m: 120, io: "mix", food: 8, crowd: 4, w: "ma", fd: ["gluten", "sweets", "dairy"] },
    { t: "Breakfast for dinner", e: "🥞", cat: "food", d: "Pancakes, eggs and bacon at 8pm. Pajamas encouraged.", c: 1, m: 75, io: "in", tr: 0, food: 5, crowd: 0, act: 1, w: "en", love: ["acts", "time"], int: ["cooking"] },
    { t: "Picnic in the park", e: "🧺", cat: "food", d: "Pack sandwiches, fruit and a blanket, then claim the best shady spot.", c: 1, m: 120, io: "out", food: 5, act: 2, adv: 2, crowd: 3, w: "mae", s: ["sp", "su", "fa"], love: ["time", "acts"] },
    { t: "Food hall feast", e: "🍔", cat: "food", d: "Split up, each grab one dish from a different stall, and share everything.", c: 2, m: 90, io: "in", food: 8, crowd: 8, w: "ae", need: ["city"] },
    { t: "Cook a dish from a random country", e: "🌍", cat: "food", d: "Spin a globe (or an app), find a recipe from wherever it lands, and cook it together.", c: 1, m: 150, io: "in", tr: 0, food: 7, adv: 5, crowd: 0, w: "ae", int: ["nerdy", "cooking"], love: ["time", "acts"] },
    { t: "Korean BBQ", e: "🥩", cat: "food", d: "Grill it yourselves at the table. Messy, loud and so good.", c: 2, m: 120, io: "in", food: 9, adv: 5, crowd: 6, w: "en", fd: ["meat", "spicy"] },
    { t: "Hot pot dinner", e: "🍲", cat: "food", d: "One bubbling pot, a pile of things to dip, and a long slow dinner.", c: 2, m: 120, io: "in", food: 9, adv: 5, crowd: 5, w: "en", fd: ["spicy", "meat"] },
    { t: "Dress-up fancy dinner", e: "🕯️", cat: "food", d: "Get properly dressed up and go somewhere with cloth napkins.", c: 3, m: 120, io: "in", food: 9, crowd: 5, act: 1, w: "e", love: ["time", "words"], int: ["fashion"] },
    { t: "$10 cheap eats challenge", e: "💵", cat: "food", d: "You each get ten bucks to find the best bite in town. Loser buys dessert.", c: 1, m: 90, io: "mix", food: 6, adv: 5, crowd: 5, w: "aen" },
    { t: "Blind taste test", e: "🙈", cat: "food", d: "Blindfolds on: guess the chip brand, the soda, the candy. Keep score.", c: 1, m: 60, io: "in", tr: 0, food: 6, crowd: 0, adv: 4, w: "en", int: ["gamer"], love: ["time", "touch"] },
    { t: "Ice cream shop tour", e: "🍦", cat: "food", d: "Two or three shops, one scoop each, and a fierce debate about the winner.", c: 1, m: 75, io: "mix", food: 6, crowd: 5, w: "aen", s: ["sp", "su", "fa"], fd: ["dairy", "sweets"] },
    { t: "Dessert-only dinner", e: "🍰", cat: "food", d: "Skip the meal entirely. Order three desserts and split them.", c: 2, m: 60, io: "in", food: 7, crowd: 5, w: "en", fd: ["sweets", "dairy"] },
    { t: "Farmers market breakfast", e: "🥕", cat: "food", d: "Graze the stalls, grab a pastry and some fruit, and build breakfast as you go.", c: 1, m: 90, io: "out", food: 6, crowd: 6, act: 3, w: "m", s: ["sp", "su", "fa"], love: ["time", "gifts"] },
    { t: "Ramen date", e: "🍜", cat: "food", d: "Find the coziest ramen counter in town and slurp loudly.", c: 1, m: 60, io: "in", food: 7, crowd: 5, w: "en", fd: ["meat", "gluten"] },
    { t: "Cooking class together", e: "👩‍🍳", cat: "food", d: "Learn to make pasta, dumplings or sushi from someone who actually knows.", c: 3, m: 150, io: "in", food: 8, adv: 4, crowd: 4, w: "e", int: ["artsy", "cooking"], love: ["time", "touch"] },
    { t: "Roll your own sushi", e: "🍱", cat: "food", d: "Buy a cheap rolling mat, make ugly rolls, eat them anyway.", c: 2, m: 120, io: "in", tr: 0, food: 7, adv: 4, crowd: 0, w: "e", int: ["artsy", "cooking"], love: ["time", "acts"], fd: ["sushi", "seafood"] },
    { t: "Late-night diner run", e: "🍟", cat: "food", d: "Fries, milkshakes and a booth at the 24-hour diner.", c: 1, m: 60, io: "in", food: 5, crowd: 3, act: 1, w: "n", fd: ["dairy"] },
    { t: "Coffee shop hop", e: "☕", cat: "food", d: "Try a drink at two or three cafés and find your new spot.", c: 1, m: 90, io: "in", food: 4, crowd: 4, act: 2, w: "ma", int: ["artsy", "nerdy", "books"], love: ["time", "words"], fd: ["coffee"] },
    { t: "Wine tasting", e: "🍷", cat: "night", d: "A winery or tasting room, a flight to share, and notes you'll laugh at later.", c: 3, m: 120, io: "in", tr: 2, food: 6, crowd: 4, w: "ae", age: 21, love: ["time", "words"] },
    { t: "Brewery & board games", e: "🍺", cat: "night", d: "A local brewery with a stack of games behind the bar.", c: 2, m: 120, io: "in", food: 4, crowd: 6, w: "en", age: 21, int: ["gamer", "nerdy"], fd: ["gluten"] },
    { t: "Cocktails with a view", e: "🍸", cat: "night", d: "Find the highest bar in town and watch the city light up.", c: 3, m: 90, io: "in", food: 3, crowd: 6, w: "en", age: 21, need: ["city"], love: ["time", "words"] },
    { t: "Bake & deliver cookies", e: "🍪", cat: "food", d: "Bake a double batch and drop surprise boxes at friends' doors.", c: 1, m: 120, io: "mix", tr: 0, food: 5, crowd: 1, w: "ae", love: ["acts", "gifts"], fd: ["gluten", "sweets", "dairy"], int: ["cooking"] },
    { t: "Fondue night", e: "🫕", cat: "food", d: "Melted cheese, then melted chocolate. Dip everything.", c: 2, m: 90, io: "in", tr: 0, food: 7, crowd: 0, w: "e", love: ["touch", "time"], fd: ["dairy", "sweets"], int: ["cooking"] },
    { t: "Chocolate tasting flight", e: "🍫", cat: "food", d: "Grab six fancy chocolate bars and taste them like it's wine.", c: 2, m: 60, io: "in", tr: 0, food: 6, crowd: 0, w: "aen", int: ["nerdy"], love: ["gifts", "time"], fd: ["sweets", "dairy"] },
    { t: "Backyard cookout", e: "🌭", cat: "food", d: "Fire up the grill, burgers and corn on the cob, music on.", c: 1, m: 120, io: "out", tr: 0, food: 6, crowd: 2, w: "ae", s: ["sp", "su", "fa"], love: ["acts", "time"], fd: ["meat"], int: ["cooking"] },
    { t: "Order the weirdest thing", e: "🦑", cat: "food", d: "Somewhere new; you each order the strangest thing on the menu.", c: 2, m: 90, io: "in", food: 8, adv: 8, crowd: 5, w: "en" },
    { t: "Breakfast in bed", e: "🛏️", cat: "home", d: "Surprise them with a tray: eggs, toast, juice and a little note.", c: 1, m: 60, io: "in", tr: 0, food: 4, act: 0, crowd: 0, w: "m", love: ["acts", "touch", "words"] },
    { t: "Pancake art contest", e: "🎨", cat: "home", d: "Squeeze-bottle batter, make pancake portraits of each other, judge harshly.", c: 1, m: 60, io: "in", tr: 0, food: 4, crowd: 0, w: "m", int: ["artsy", "cooking"], fd: ["gluten"] },
    { t: "Donuts at the lookout", e: "🍩", cat: "food", d: "Grab a dozen at sunrise and eat them somewhere with a view.", c: 1, m: 75, io: "out", tr: 1, food: 5, crowd: 1, w: "m", love: ["time"], fd: ["sweets", "gluten"] },
    { t: "Midnight milkshake drive", e: "🥤", cat: "night", d: "Windows down, playlist up, and a drive-thru shake at the end.", c: 1, m: 60, io: "mix", tr: 1, food: 3, crowd: 1, act: 0, w: "n", age: 16, int: ["musical", "cars"], fd: ["dairy", "sweets"] },
    { t: "Watch the big game with wings", e: "🍗", cat: "home", d: "Homemade wings, every sauce you can find, and the game on.", c: 1, m: 180, io: "in", tr: 0, food: 6, crowd: 2, w: "ae", int: ["sporty"], fd: ["meat", "spicy"] },
    { t: "Living room picnic", e: "🧺", cat: "home", d: "Blanket on the floor, candles, cheese and crackers, phones away.", c: 1, m: 90, io: "in", tr: 0, food: 4, act: 0, crowd: 0, w: "en", love: ["time", "touch"] },

    // ---------- OUTDOORS ----------
    { t: "Sunrise hike", e: "🌄", cat: "outdoors", d: "Headlamps, a thermos, and the top of the trail just as the sun comes up.", c: 0, m: 180, io: "out", tr: 2, act: 7, adv: 6, crowd: 1, w: "m", need: ["trails"], int: ["outdoorsy", "sporty"] },
    { t: "Sunset picnic on a hill", e: "🌅", cat: "outdoors", d: "Find the highest spot nearby, bring snacks, and watch the sky change.", c: 1, m: 120, io: "out", act: 3, crowd: 2, w: "e", s: ["sp", "su", "fa"], love: ["time", "words"] },
    { t: "Stargazing", e: "🌌", cat: "outdoors", d: "Drive past the city lights, lie on the hood, and find the planets with an app.", c: 0, m: 120, io: "out", tr: 2, act: 1, adv: 3, crowd: 0, w: "n", int: ["nerdy", "outdoorsy"], love: ["time", "words", "touch"] },
    { t: "Paddleboard or kayak", e: "🛶", cat: "outdoors", d: "Rent boards or a tandem kayak and paddle out across the lake.", c: 2, m: 180, io: "out", tr: 2, act: 7, adv: 6, crowd: 3, w: "ma", s: ["sp", "su", "fa"], need: ["lake"], int: ["sporty", "outdoorsy"] },
    { t: "Lake day", e: "🏞️", cat: "outdoors", d: "Swimsuits, a cooler and a whole lazy afternoon at the water.", c: 1, m: 300, io: "out", tr: 2, act: 4, adv: 3, crowd: 5, w: "a", s: ["su"], need: ["lake"], int: ["outdoorsy"] },
    { t: "Beach day", e: "🏖️", cat: "outdoors", d: "Towels, sunscreen, a speaker, and nowhere else to be.", c: 1, m: 300, io: "out", tr: 2, act: 4, adv: 3, crowd: 6, w: "a", s: ["su"], need: ["beach"], int: ["outdoorsy"], love: ["time", "touch"] },
    { t: "Beach bonfire", e: "🔥", cat: "outdoors", d: "Firewood, s'mores and a blanket as the sun goes down over the water.", c: 1, m: 150, io: "out", tr: 2, act: 2, adv: 4, crowd: 3, w: "en", s: ["su", "fa"], need: ["beach"], love: ["touch", "time"], fd: ["sweets"] },
    { t: "Tide pooling", e: "🦀", cat: "outdoors", d: "Low tide, rocky shore, and a contest to find the coolest creature.", c: 0, m: 120, io: "out", tr: 2, act: 4, adv: 5, crowd: 2, w: "ma", need: ["coast"], int: ["nerdy", "outdoorsy", "animals"] },
    { t: "Waterfall hunt", e: "💦", cat: "outdoors", d: "Look up the closest waterfall trail and make it the destination.", c: 0, m: 240, io: "out", tr: 3, act: 6, adv: 6, crowd: 3, w: "ma", s: ["sp", "su", "fa"], need: ["mountains"], int: ["outdoorsy", "sporty"] },
    { t: "Geocaching treasure hunt", e: "🧭", cat: "outdoors", d: "Download the app and find three hidden caches around town.", c: 0, m: 120, io: "out", act: 4, adv: 5, crowd: 1, w: "ma", int: ["nerdy", "gamer", "outdoorsy"] },
    { t: "Botanical garden stroll", e: "🌷", cat: "outdoors", d: "Wander the paths and each pick the plant that's most like the other person.", c: 1, m: 120, io: "out", act: 2, crowd: 4, w: "ma", s: ["sp", "su", "fa"], need: ["city"], int: ["artsy"], love: ["time", "words"] },
    { t: "Bike to a café", e: "🚲", cat: "outdoors", d: "Ride somewhere a few miles away for a treat, then ride back.", c: 1, m: 120, io: "out", act: 6, adv: 3, crowd: 3, w: "ma", s: ["sp", "su", "fa"], int: ["sporty", "outdoorsy"] },
    { t: "Fishing morning", e: "🎣", cat: "outdoors", d: "Cheap poles, early start, and a bet on who catches the first fish.", c: 1, m: 180, io: "out", tr: 2, act: 2, adv: 3, crowd: 1, w: "m", s: ["sp", "su", "fa"], need: ["lake"], int: ["outdoorsy", "animals"] },
    { t: "Overnight camping trip", e: "⛺", cat: "outdoors", d: "Pitch a tent, cook over the fire, and stay up talking.", c: 2, m: 1200, io: "out", tr: 3, act: 5, adv: 8, crowd: 1, w: "a", age: 18, s: ["sp", "su", "fa"], need: ["trails"], int: ["outdoorsy"], love: ["time", "touch"] },
    { t: "Backyard campout", e: "🏕️", cat: "home", d: "Tent in the yard, flashlights, snacks and ghost stories.", c: 0, m: 240, io: "out", tr: 0, act: 1, adv: 3, crowd: 0, w: "n", s: ["su", "fa"], int: ["outdoorsy"], love: ["touch", "time"] },
    { t: "Walk shelter dogs", e: "🐶", cat: "outdoors", d: "Lots of animal shelters let volunteers walk dogs. Instant happiness.", c: 0, m: 120, io: "out", act: 4, crowd: 2, w: "ma", int: ["outdoorsy", "animals"], love: ["acts", "time"] },
    { t: "Scenic drive with a playlist", e: "🚗", cat: "adventure", d: "Pick a pretty road, take turns as DJ, stop wherever looks good.", c: 1, m: 150, io: "mix", tr: 2, act: 0, adv: 3, crowd: 0, w: "ae", age: 16, int: ["musical", "cars"], love: ["time"] },
    { t: "Fall-colors drive", e: "🍁", cat: "seasonal", d: "Chase the reds and golds up the canyon. Stop for photos and cider.", c: 1, m: 180, io: "mix", tr: 3, act: 1, adv: 3, crowd: 2, w: "a", age: 16, s: ["fa"], need: ["mountains"], int: ["outdoorsy", "artsy", "cars"] },
    { t: "Summit a mountain", e: "⛰️", cat: "outdoors", d: "Pick a peak, pack lunch, and eat it on top.", c: 0, m: 360, io: "out", tr: 3, act: 9, adv: 8, crowd: 2, w: "m", s: ["su", "fa"], need: ["mountains"], int: ["outdoorsy", "sporty"] },
    { t: "Hammock & books", e: "📚", cat: "outdoors", d: "Two hammocks (or one big blanket), two books, a quiet park.", c: 0, m: 120, io: "out", act: 0, adv: 0, crowd: 2, w: "a", s: ["sp", "su", "fa"], int: ["nerdy", "books"], love: ["time"] },
    { t: "Fly a kite", e: "🪁", cat: "outdoors", d: "Cheap kite, windy hill, and way more fun than you'd expect.", c: 1, m: 90, io: "out", act: 3, adv: 2, crowd: 2, w: "a", s: ["sp", "su", "fa"], int: ["artsy", "outdoorsy"] },
    { t: "Disc golf", e: "🥏", cat: "active", d: "Most parks have a free course. Borrow discs and keep score.", c: 0, m: 120, io: "out", act: 5, adv: 3, crowd: 2, w: "ma", s: ["sp", "su", "fa"], int: ["sporty", "gamer", "outdoorsy"] },
    { t: "Bird-watching walk", e: "🐦", cat: "outdoors", d: "Use a free bird-ID app and see who spots the most species.", c: 0, m: 90, io: "out", act: 3, adv: 2, crowd: 1, w: "m", int: ["nerdy", "outdoorsy", "animals"] },
    { t: "River tubing", e: "🛟", cat: "outdoors", d: "Rent tubes, float the river, and try not to flip.", c: 1, m: 180, io: "out", tr: 2, act: 4, adv: 6, crowd: 5, w: "a", s: ["su"], need: ["river"], int: ["outdoorsy"] },
    { t: "Hot springs soak", e: "♨️", cat: "outdoors", d: "Find a natural hot spring and soak while it's chilly outside.", c: 1, m: 240, io: "out", tr: 3, act: 2, adv: 5, crowd: 3, w: "ae", s: ["fa", "wi", "sp"], need: ["hotspring"], int: ["outdoorsy"], love: ["touch", "time"] },
    { t: "Photo walk", e: "📸", cat: "culture", d: "Pick a theme (doors, shadows, the color red) and shoot it around town.", c: 0, m: 90, io: "out", act: 3, adv: 3, crowd: 3, w: "ae", int: ["artsy"], love: ["time"] },
    { t: "Creek walk & rock skipping", e: "🪨", cat: "outdoors", d: "Shoes off, wade the shallows, and settle who can skip the most.", c: 0, m: 90, io: "out", tr: 2, act: 3, adv: 3, crowd: 1, w: "a", s: ["su", "fa"], need: ["river"], int: ["outdoorsy"] },
    { t: "Find the best sunset spot", e: "🌇", cat: "outdoors", d: "Scout a rooftop, hill or parking garage with the best view in town.", c: 0, m: 60, io: "out", act: 2, adv: 3, crowd: 2, w: "e", love: ["time", "touch"] },
    { t: "Nature scavenger hunt", e: "🍄", cat: "outdoors", d: "Make a list (pinecone, heart-shaped rock, a feather) and race to find it all.", c: 0, m: 90, io: "out", act: 4, adv: 4, crowd: 1, w: "ma", int: ["outdoorsy", "gamer"] },
    { t: "Zoo day", e: "🦒", cat: "outdoors", d: "Each pick a favorite animal and plan the whole route around seeing them.", c: 2, m: 240, io: "out", act: 4, crowd: 8, w: "ma", need: ["city"], int: ["nerdy", "animals"] },
    { t: "Aquarium visit", e: "🐧", cat: "culture", d: "Jellyfish, sharks and penguins. Dim lights make it weirdly romantic.", c: 2, m: 150, io: "in", act: 2, crowd: 7, w: "ma", need: ["city"], int: ["nerdy", "animals"], love: ["time", "touch"] },
    { t: "Paddle boat on the pond", e: "🦢", cat: "outdoors", d: "Pedal around slowly, feed the ducks, no destination required.", c: 1, m: 60, io: "out", act: 4, adv: 2, crowd: 3, w: "a", s: ["sp", "su"], need: ["lake"], love: ["time", "touch"], int: ["animals"] },
    { t: "Farm visit", e: "🐐", cat: "outdoors", d: "Lots of farms let you feed goats and hold baby chicks. Do it.", c: 1, m: 120, io: "out", tr: 2, act: 3, crowd: 4, w: "ma", s: ["sp", "su", "fa"], int: ["outdoorsy", "animals"] },
    { t: "Flea market treasure hunt", e: "🏷️", cat: "outdoors", d: "$5 each to find the best weird treasure for the other person.", c: 1, m: 120, io: "out", act: 3, adv: 4, crowd: 7, w: "m", s: ["sp", "su", "fa"], int: ["artsy", "fashion"], love: ["gifts"] },
    { t: "Chess in the park", e: "♟️", cat: "outdoors", d: "Travel board, park bench, best of three.", c: 0, m: 90, io: "out", act: 1, adv: 1, crowd: 3, w: "a", s: ["sp", "su", "fa"], int: ["nerdy", "gamer"] },
    { t: "Launch a model rocket", e: "🚀", cat: "outdoors", d: "Hobby store kit, an open field, and a countdown from ten.", c: 1, m: 150, io: "out", act: 3, adv: 6, crowd: 1, w: "a", s: ["sp", "su", "fa"], int: ["nerdy"] },
    { t: "Sidewalk chalk mural", e: "🖍️", cat: "home", d: "A bucket of chalk and the whole driveway. Make something huge.", c: 0, m: 90, io: "out", tr: 0, act: 3, crowd: 1, w: "a", s: ["sp", "su", "fa"], int: ["artsy"] },
    { t: "AR game walk", e: "📱", cat: "outdoors", d: "Play Pokémon GO (or similar) around downtown and team up on raids.", c: 0, m: 90, io: "out", act: 4, adv: 3, crowd: 4, w: "aen", int: ["gamer", "nerdy"] },
    { t: "Tandem bike ride", e: "🚴", cat: "outdoors", d: "Rent a bike built for two and try to steer without arguing.", c: 2, m: 90, io: "out", act: 6, adv: 4, crowd: 3, w: "a", s: ["sp", "su", "fa"], int: ["sporty"], love: ["touch", "time"] },
    { t: "Cherry blossom walk", e: "🌸", cat: "seasonal", d: "Catch the blossoms during their two short weeks and take the photo.", c: 0, m: 90, io: "out", act: 3, crowd: 5, w: "ma", s: ["sp"], int: ["artsy"], love: ["time", "touch"] },

    // ---------- ACTIVE ----------
    { t: "Climbing gym", e: "🧗", cat: "active", d: "Rent shoes, belay each other, and cheer at the top.", c: 2, m: 120, io: "in", act: 9, adv: 7, crowd: 4, w: "ae", int: ["sporty"], love: ["time", "words"] },
    { t: "Trampoline park", e: "🤸", cat: "active", d: "Foam pits, dodgeball, and laughing until you can't breathe.", c: 2, m: 90, io: "in", act: 8, adv: 5, crowd: 7, w: "ae", int: ["sporty"] },
    { t: "Roller skating", e: "🛼", cat: "active", d: "Disco lights, old-school music, and holding hands so nobody falls.", c: 1, m: 120, io: "in", act: 7, adv: 5, crowd: 6, w: "en", int: ["musical", "sporty"], love: ["touch", "time"] },
    { t: "Ice skating", e: "⛸️", cat: "active", d: "Indoor rink, rented skates, wobbling together.", c: 1, m: 90, io: "in", act: 6, adv: 4, crowd: 6, w: "aen", int: ["sporty"], love: ["touch", "time"] },
    { t: "Outdoor ice rink under lights", e: "✨", cat: "seasonal", d: "Skate outside with music and lights, then hot cocoa after.", c: 1, m: 120, io: "out", act: 6, adv: 4, crowd: 7, w: "en", s: ["wi"], need: ["city"], love: ["touch", "time"] },
    { t: "Glow bowling", e: "🎳", cat: "active", d: "Blacklights, loud music, and a bet riding on the last frame.", c: 1, m: 90, io: "in", act: 3, adv: 2, crowd: 6, w: "en", int: ["sporty", "gamer"] },
    { t: "Mini golf", e: "⛳", cat: "active", d: "Windmills, loop-the-loops, and some serious trash talk.", c: 1, m: 75, io: "out", act: 3, adv: 2, crowd: 5, w: "aen", s: ["sp", "su", "fa"], int: ["gamer", "sporty"] },
    { t: "Batting cages", e: "⚾", cat: "active", d: "A few tokens each and see who connects first.", c: 1, m: 60, io: "out", act: 6, adv: 3, crowd: 3, w: "ae", s: ["sp", "su", "fa"], int: ["sporty"] },
    { t: "Go-karts", e: "🏎️", cat: "active", d: "Race, bump, rematch. Loser buys the slushies.", c: 2, m: 60, io: "mix", act: 5, adv: 7, crowd: 5, w: "aen", int: ["gamer", "sporty", "cars"] },
    { t: "Pickleball match", e: "🎾", cat: "active", d: "Borrow paddles, find a free court, play to eleven.", c: 0, m: 90, io: "out", act: 7, adv: 3, crowd: 3, w: "mae", s: ["sp", "su", "fa"], int: ["sporty"] },
    { t: "Salsa or swing class", e: "💃", cat: "active", d: "Lots of studios have a cheap drop-in beginner night. Nobody's good at first.", c: 2, m: 90, io: "in", act: 7, adv: 6, crowd: 5, w: "e", int: ["musical", "theater"], love: ["touch", "time"] },
    { t: "Yoga in the park", e: "🧘", cat: "active", d: "Two mats, a YouTube class, and the morning sun.", c: 0, m: 60, io: "out", act: 4, adv: 2, crowd: 2, w: "m", s: ["sp", "su", "fa"], int: ["sporty"] },
    { t: "Mountain biking", e: "🚵", cat: "active", d: "Rent bikes and hit a beginner trail. Mud is a bonus.", c: 2, m: 180, io: "out", tr: 2, act: 9, adv: 8, crowd: 2, w: "ma", s: ["sp", "su", "fa"], need: ["trails"], int: ["sporty", "outdoorsy"] },
    { t: "Horseback trail ride", e: "🐴", cat: "outdoors", d: "A guided ride, no experience needed, through some pretty country.", c: 3, m: 150, io: "out", tr: 3, act: 5, adv: 7, crowd: 2, w: "ma", s: ["sp", "su", "fa"], int: ["outdoorsy", "animals"] },
    { t: "Axe throwing", e: "🪓", cat: "active", d: "Way easier than it looks and weirdly satisfying.", c: 2, m: 75, io: "in", act: 5, adv: 7, crowd: 5, w: "en", age: 16, int: ["sporty", "gamer"] },
    { t: "Laser tag", e: "🔫", cat: "active", d: "Same team or rivals? Decide in the parking lot.", c: 2, m: 60, io: "in", act: 7, adv: 5, crowd: 7, w: "aen", int: ["gamer"] },
    { t: "Swim at the rec center", e: "🏊", cat: "active", d: "Water slides, a lazy river, maybe a cannonball contest.", c: 1, m: 120, io: "in", act: 6, adv: 3, crowd: 6, w: "ae", int: ["sporty"] },
    { t: "Run a 5K together", e: "🏃", cat: "active", d: "Sign up for a fun run (costume optional) and cross the line together.", c: 1, m: 120, io: "out", act: 9, adv: 4, crowd: 8, w: "m", s: ["sp", "su", "fa"], int: ["sporty"] },
    { t: "One-on-one hoops", e: "🏀", cat: "active", d: "Park court, H-O-R-S-E, then a real game to 11.", c: 0, m: 60, io: "out", act: 7, adv: 2, crowd: 2, w: "ae", s: ["sp", "su", "fa"], int: ["sporty"] },
    { t: "Ski or snowboard day", e: "🎿", cat: "active", d: "First chair to last run, with a hot lunch in the lodge.", c: 3, m: 420, io: "out", tr: 3, act: 9, adv: 8, crowd: 6, w: "ma", s: ["wi"], need: ["ski"], int: ["sporty", "outdoorsy"] },
    { t: "Sledding", e: "🛷", cat: "seasonal", d: "Find the steepest hill in town and share a sled.", c: 0, m: 120, io: "out", act: 6, adv: 5, crowd: 4, w: "a", s: ["wi"], need: ["snow"], love: ["touch", "time"] },
    { t: "Snowshoe walk", e: "❄️", cat: "outdoors", d: "Rent snowshoes and crunch through a quiet snowy trail.", c: 1, m: 150, io: "out", tr: 2, act: 6, adv: 5, crowd: 1, w: "ma", s: ["wi"], need: ["snow", "trails"], int: ["outdoorsy"] },
    { t: "Snowman & snow fort", e: "⛄", cat: "home", d: "Build the best snowman on the street, then defend your fort.", c: 0, m: 90, io: "out", tr: 0, act: 5, adv: 3, crowd: 1, w: "a", s: ["wi"], need: ["snow"], love: ["time", "touch"] },
    { t: "Indoor skydiving", e: "🪂", cat: "adventure", d: "A wind tunnel that makes you fly. Safe, loud, unforgettable.", c: 3, m: 90, io: "in", tr: 2, act: 6, adv: 10, crowd: 4, w: "ae", need: ["city"], int: ["sporty"] },
    { t: "Ropes course & zipline", e: "🌲", cat: "adventure", d: "Clip in, cross wobbly bridges high in the trees, then zip down.", c: 3, m: 180, io: "out", tr: 2, act: 8, adv: 9, crowd: 4, w: "ma", s: ["sp", "su", "fa"], int: ["sporty", "outdoorsy"] },
    { t: "Paintball", e: "🎯", cat: "active", d: "Gear up, pick a team, and come home with stories (and bruises).", c: 2, m: 180, io: "out", tr: 2, act: 8, adv: 8, crowd: 6, w: "ma", int: ["gamer", "sporty"] },
    { t: "Try a sport neither of you plays", e: "🥍", cat: "active", d: "Lacrosse, badminton, spikeball... look up the rules and wing it.", c: 1, m: 90, io: "out", act: 7, adv: 7, crowd: 2, w: "ae", s: ["sp", "su", "fa"], int: ["sporty"] },
    { t: "Learn a TikTok dance", e: "🕺", cat: "home", d: "Pick a trending dance, practice until it's perfect, film the final take.", c: 0, m: 60, io: "in", tr: 0, act: 5, adv: 4, crowd: 0, w: "aen", int: ["musical", "theater"], love: ["touch", "time"] },
    { t: "Water balloon fight", e: "💦", cat: "home", d: "Fill a hundred balloons. No mercy.", c: 0, m: 60, io: "out", tr: 0, act: 6, adv: 4, crowd: 1, w: "a", s: ["su"] },

    // ---------- CULTURE / ARTSY / NERDY ----------
    { t: "Art museum favorites", e: "🖼️", cat: "culture", d: "Split up for 20 minutes, then show each other the piece you'd steal.", c: 1, m: 120, io: "in", act: 2, crowd: 4, w: "a", need: ["city"], int: ["artsy", "nerdy"], love: ["words", "time"] },
    { t: "Science museum", e: "🔬", cat: "culture", d: "Push every button. Read every sign. Become briefly a genius.", c: 2, m: 150, io: "in", act: 2, crowd: 6, w: "a", need: ["city"], int: ["nerdy"] },
    { t: "Planetarium show", e: "🪐", cat: "culture", d: "Lean back under the dome and tour the universe.", c: 1, m: 60, io: "in", act: 0, crowd: 4, w: "ae", need: ["city"], int: ["nerdy"], love: ["touch", "time"] },
    { t: "Open mic night", e: "🎤", cat: "culture", d: "Watch brave locals sing and read poetry. Maybe sign up yourselves.", c: 0, m: 120, io: "in", act: 1, adv: 5, crowd: 5, w: "en", int: ["musical", "artsy", "theater"] },
    { t: "Live local band", e: "🎸", cat: "culture", d: "Find a small all-ages show and stand right up front.", c: 1, m: 150, io: "in", act: 4, adv: 4, crowd: 7, w: "en", int: ["musical"] },
    { t: "Comedy show", e: "😂", cat: "night", d: "Stand-up at a local club. Sit in the back row if you're nervous.", c: 2, m: 120, io: "in", act: 1, adv: 4, crowd: 7, w: "en", age: 18, int: ["theater"] },
    { t: "Community theater", e: "🎭", cat: "culture", d: "Cheap tickets, local actors, surprisingly great shows.", c: 2, m: 150, io: "in", act: 1, crowd: 6, w: "e", int: ["artsy", "musical", "theater"] },
    { t: "Pick a book for each other", e: "📖", cat: "culture", d: "Bookstore, $15 budget, ten minutes to choose the perfect book for them.", c: 1, m: 75, io: "in", act: 1, crowd: 2, w: "ae", int: ["nerdy", "artsy", "books"], love: ["gifts", "words"] },
    { t: "Paint pottery", e: "🏺", cat: "culture", d: "Paint mugs at a pottery studio, pick them up next week, think of each other.", c: 2, m: 120, io: "in", act: 1, crowd: 3, w: "ae", int: ["artsy"], love: ["gifts", "time"] },
    { t: "Paint night", e: "🎨", cat: "culture", d: "Follow along with an instructor and see whose painting is uglier.", c: 2, m: 120, io: "in", act: 1, crowd: 5, w: "e", int: ["artsy"] },
    { t: "Thrift store outfit challenge", e: "👕", cat: "culture", d: "$10 each to dress the other person. Wear it to dinner.", c: 1, m: 90, io: "in", act: 2, adv: 6, crowd: 4, w: "a", int: ["artsy", "fashion"], love: ["gifts"] },
    { t: "First Friday art walk", e: "🏛️", cat: "culture", d: "Galleries stay open late with free snacks. Wander and judge.", c: 0, m: 120, io: "mix", act: 3, crowd: 6, w: "e", need: ["city"], int: ["artsy"] },
    { t: "Concert in the park", e: "🎻", cat: "culture", d: "Free summer music series, blanket on the grass.", c: 0, m: 150, io: "out", act: 1, crowd: 7, w: "e", s: ["su"], int: ["musical"], love: ["touch", "time"] },
    { t: "Big concert", e: "🎶", cat: "culture", d: "Tickets to see someone you both love. Sing every word.", c: 3, m: 240, io: "in", tr: 2, act: 5, adv: 5, crowd: 10, w: "en", int: ["musical"], love: ["gifts", "time"] },
    { t: "Drive-in movie", e: "🚘", cat: "culture", d: "Snacks, blankets and the movie through the car radio.", c: 1, m: 180, io: "out", tr: 2, act: 0, crowd: 4, w: "n", s: ["sp", "su", "fa"], love: ["touch", "time"], int: ["cars"] },
    { t: "Movie + rate it after", e: "🍿", cat: "culture", d: "See something new, then rate it over fries and argue about the ending.", c: 1, m: 180, io: "in", act: 0, crowd: 5, w: "en", love: ["time"] },
    { t: "Local history walk", e: "🏰", cat: "culture", d: "Look up the oldest buildings in town and make your own tour.", c: 0, m: 90, io: "out", act: 3, crowd: 2, w: "ma", need: ["city"], int: ["nerdy", "books"] },
    { t: "Escape room", e: "🔐", cat: "culture", d: "60 minutes, locked in, find out how well you work together.", c: 2, m: 90, io: "in", act: 3, adv: 6, crowd: 3, w: "aen", int: ["nerdy", "gamer"] },
    { t: "Trivia night", e: "🧠", cat: "culture", d: "Team of two against the regulars. Pick a ridiculous team name.", c: 0, m: 120, io: "in", act: 0, adv: 3, crowd: 6, w: "e", int: ["nerdy"] },
    { t: "Arcade battle", e: "👾", cat: "culture", d: "$20 in tokens, every two-player game, winner picks dinner.", c: 1, m: 90, io: "in", act: 3, adv: 3, crowd: 7, w: "aen", int: ["gamer"] },
    { t: "Barcade night", e: "🕹️", cat: "night", d: "Classic arcade cabinets and drinks. Pac-Man high score showdown.", c: 2, m: 120, io: "in", act: 2, adv: 3, crowd: 7, w: "n", age: 21, int: ["gamer"] },
    { t: "Board game café", e: "🎲", cat: "culture", d: "Hundreds of games on the wall; let the staff pick one for you.", c: 1, m: 120, io: "in", act: 0, crowd: 4, w: "aen", int: ["gamer", "nerdy"] },
    { t: "Private karaoke room", e: "🎙️", cat: "culture", d: "Just the two of you, a microphone, and zero shame.", c: 1, m: 90, io: "in", act: 3, adv: 6, crowd: 1, w: "en", int: ["musical"], love: ["time"] },
    { t: "Record store dig", e: "💿", cat: "culture", d: "Flip through the crates and buy each other one album.", c: 1, m: 75, io: "in", act: 1, crowd: 2, w: "a", int: ["musical", "artsy"], love: ["gifts"] },
    { t: "Jazz club", e: "🎷", cat: "night", d: "Low lights, a live trio, and a corner table.", c: 2, m: 120, io: "in", act: 0, crowd: 5, w: "n", age: 21, need: ["city"], int: ["musical"], love: ["time", "touch"] },
    { t: "Pool hall", e: "🎱", cat: "culture", d: "Rack 'em up. Learn a trick shot from a YouTube video first.", c: 1, m: 90, io: "in", act: 2, crowd: 4, w: "en", age: 18, int: ["gamer"] },
    { t: "Cheer at a local game", e: "🏟️", cat: "culture", d: "Minor league, college or high school. Cheap seats, loud crowd, ballpark snacks.", c: 1, m: 180, io: "out", act: 2, crowd: 9, w: "e", int: ["sporty"] },
    { t: "VR arcade", e: "🥽", cat: "culture", d: "Fight zombies or fly spaceships side by side.", c: 2, m: 60, io: "in", act: 4, adv: 6, crowd: 3, w: "aen", int: ["gamer", "nerdy"] },
    { t: "Comic shop swap picks", e: "🦸", cat: "culture", d: "Each pick a comic or manga for the other to read, then compare notes.", c: 1, m: 60, io: "in", act: 1, crowd: 2, w: "a", int: ["nerdy", "artsy", "books"], love: ["gifts"] },
    { t: "Cat café", e: "🐱", cat: "culture", d: "Drinks while cats ignore you. Then one doesn't.", c: 1, m: 75, io: "in", act: 0, crowd: 3, w: "a", love: ["time", "touch"], int: ["animals"] },
    { t: "Car show or Cars & Coffee", e: "🚙", cat: "culture", d: "Weekend morning meetups are free. Pick your dream car.", c: 0, m: 90, io: "out", act: 2, crowd: 6, w: "m", s: ["sp", "su", "fa"], int: ["cars"] },

    // ---------- AT HOME ----------
    { t: "Blanket fort movie marathon", e: "🏰", cat: "home", d: "Build a fort, pick a trilogy, and don't leave until it's over.", c: 0, m: 360, io: "in", tr: 0, act: 0, adv: 1, crowd: 0, w: "en", love: ["touch", "time"] },
    { t: "Two-player board games", e: "🎲", cat: "home", d: "Pull out every game you own for two players and hold a tournament.", c: 0, m: 120, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", int: ["gamer", "nerdy"] },
    { t: "Co-op video game night", e: "🎮", cat: "home", d: "Pick a co-op game (It Takes Two, Overcooked) and beat it together.", c: 0, m: 180, io: "in", tr: 0, act: 0, adv: 2, crowd: 0, w: "en", int: ["gamer"], love: ["time"] },
    { t: "Puzzle & playlist", e: "🧩", cat: "home", d: "A 1000-piece puzzle, a good playlist, and nowhere to be.", c: 1, m: 180, io: "in", tr: 0, act: 0, adv: 0, crowd: 0, w: "aen", int: ["nerdy"], love: ["time"] },
    { t: "At-home spa night", e: "🧖", cat: "home", d: "Face masks, foot soaks, candles and a chill playlist.", c: 1, m: 90, io: "in", tr: 0, act: 0, adv: 1, crowd: 0, w: "en", love: ["touch", "acts"] },
    { t: "Write letters to open in a year", e: "💌", cat: "home", d: "Write each other a letter, seal it, and put a date on the envelope.", c: 0, m: 45, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", love: ["words"], int: ["books"] },
    { t: "Cook their childhood favorite", e: "🍲", cat: "home", d: "Ask what their family made growing up, then try to recreate it.", c: 1, m: 120, io: "in", tr: 0, food: 6, crowd: 0, w: "e", love: ["acts", "words"], int: ["cooking"] },
    { t: "Make playlists for each other", e: "🎧", cat: "home", d: "Ten songs that remind you of them. Listen together, explain each one.", c: 0, m: 60, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", int: ["musical"], love: ["gifts", "words"] },
    { t: "Paint each other's portraits", e: "🖌️", cat: "home", d: "Cheap canvases, 30-minute timer, big reveal.", c: 1, m: 75, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", int: ["artsy"], love: ["time", "words"] },
    { t: "Plant a mini garden", e: "🪴", cat: "home", d: "Pick up succulents or herbs and pot them together. Name them.", c: 1, m: 60, io: "mix", tr: 0, act: 2, crowd: 0, w: "ma", s: ["sp", "su"], int: ["outdoorsy", "artsy"], love: ["gifts", "acts"] },
    { t: "Make a time capsule", e: "⏳", cat: "home", d: "Photos, receipts, predictions. Bury it or hide it for a year.", c: 0, m: 60, io: "in", tr: 0, act: 1, crowd: 0, w: "aen", love: ["words", "gifts"] },
    { t: "Tie-dye shirts", e: "🌈", cat: "home", d: "A kit, white shirts and rubber bands. Wear them on your next date.", c: 1, m: 90, io: "out", tr: 0, act: 2, crowd: 0, w: "a", s: ["sp", "su", "fa"], int: ["artsy", "fashion"], love: ["gifts"] },
    { t: "Documentary & debate", e: "📺", cat: "home", d: "Watch a wild documentary, then argue about it over snacks.", c: 0, m: 120, io: "in", tr: 0, act: 0, crowd: 0, w: "en", int: ["nerdy"], love: ["words", "time"] },
    { t: "Bake-off challenge", e: "🧁", cat: "home", d: "Same recipe, separate bowls, blind judging by a roommate.", c: 1, m: 120, io: "in", tr: 0, food: 6, adv: 3, crowd: 0, w: "ae", int: ["artsy", "cooking"], love: ["time"], fd: ["sweets", "gluten", "dairy"] },
    { t: "36 Questions night", e: "💬", cat: "home", d: "The famous '36 questions to fall in love.' Take turns, no skipping.", c: 0, m: 75, io: "in", tr: 0, act: 0, crowd: 0, w: "en", love: ["words", "time"] },
    { t: "Build a LEGO set", e: "🧱", cat: "home", d: "One builds, one hands pieces. Swap halfway.", c: 2, m: 150, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", int: ["nerdy", "gamer"], love: ["time"] },
    { t: "Living room karaoke", e: "🎤", cat: "home", d: "YouTube karaoke on the TV, hairbrush microphones.", c: 0, m: 90, io: "in", tr: 0, act: 3, adv: 4, crowd: 0, w: "en", int: ["musical"] },
    { t: "Scrapbook your dates", e: "📒", cat: "home", d: "Print photos, glue in ticket stubs, write captions.", c: 1, m: 90, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", int: ["artsy"], love: ["words", "gifts"] },
    { t: "Make candles", e: "🕯️", cat: "home", d: "Soy wax, jars and scents. Make one for each other.", c: 2, m: 90, io: "in", tr: 0, act: 1, crowd: 0, w: "ae", int: ["artsy"], love: ["gifts"] },
    { t: "Fix something together", e: "🔧", cat: "home", d: "The wobbly bike, the squeaky door, the room that needs paint. Teamwork.", c: 0, m: 120, io: "mix", tr: 0, act: 4, crowd: 0, w: "ma", love: ["acts", "time"] },
    { t: "Learn a song on ukulele", e: "🪕", cat: "home", d: "Borrow or buy a cheap uke and learn one song start to finish.", c: 1, m: 90, io: "in", tr: 0, act: 1, adv: 3, crowd: 0, w: "aen", int: ["musical"], love: ["time"] },
    { t: "Make a song together", e: "🎹", cat: "home", d: "Use GarageBand or a free app to record a terrible, perfect song.", c: 0, m: 120, io: "in", tr: 0, act: 1, adv: 4, crowd: 0, w: "aen", int: ["musical", "nerdy"], love: ["time", "words"] },
    { t: "Double-date game night", e: "👯", cat: "home", d: "Invite another couple over for Codenames, snacks and chaos.", c: 0, m: 180, io: "in", tr: 0, act: 1, crowd: 4, w: "en", int: ["gamer"] },
    { t: "Phone-free film short", e: "🎬", cat: "home", d: "Write, shoot and edit a two-minute movie on your phones. Premiere tonight.", c: 0, m: 150, io: "mix", tr: 0, act: 3, adv: 5, crowd: 1, w: "a", int: ["artsy", "nerdy", "theater"] },
    { t: "Fire pit s'mores", e: "🔥", cat: "home", d: "Backyard fire, marshmallows, and a blanket for two.", c: 1, m: 90, io: "out", tr: 0, act: 0, crowd: 0, w: "n", s: ["sp", "su", "fa"], love: ["touch", "time"], fd: ["sweets", "gluten"] },
    { t: "Compliment jar", e: "🫙", cat: "home", d: "Write twenty little notes about why you like each other and swap jars.", c: 0, m: 45, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", love: ["words", "gifts"] },
    { t: "Massage & movie", e: "💆", cat: "home", d: "Trade back rubs during a comfort movie. Ten minutes each, timer on.", c: 0, m: 120, io: "in", tr: 0, act: 0, crowd: 0, w: "en", love: ["touch"] },
    { t: "Cook their meal-prep for the week", e: "🥡", cat: "home", d: "Make a week of lunches together so future-them is happy.", c: 1, m: 120, io: "in", tr: 0, food: 5, crowd: 0, w: "a", love: ["acts"], int: ["cooking"] },

    // ---------- SEASONAL ----------
    { t: "Pumpkin patch", e: "🎃", cat: "seasonal", d: "Find the biggest, weirdest pumpkin in the field.", c: 1, m: 120, io: "out", tr: 2, act: 3, crowd: 6, w: "ma", s: ["fa"], int: ["outdoorsy"] },
    { t: "Corn maze", e: "🌽", cat: "seasonal", d: "Get lost on purpose. Bonus points for doing it after dark.", c: 1, m: 90, io: "out", tr: 2, act: 4, adv: 5, crowd: 5, w: "aen", s: ["fa"], int: ["gamer"] },
    { t: "Haunted house", e: "👻", cat: "seasonal", d: "Scream, grab each other, laugh about it after.", c: 2, m: 90, io: "in", tr: 1, act: 3, adv: 8, crowd: 7, w: "en", s: ["fa"], love: ["touch"] },
    { t: "Carve pumpkins", e: "🔪", cat: "seasonal", d: "Two pumpkins, one theme, a candle-lit reveal.", c: 1, m: 90, io: "mix", tr: 0, act: 1, crowd: 0, w: "en", s: ["fa"], int: ["artsy"], love: ["time"] },
    { t: "Apple picking", e: "🍎", cat: "seasonal", d: "Fill a bag at an orchard, then bake something with the haul.", c: 1, m: 150, io: "out", tr: 2, act: 3, crowd: 4, w: "ma", s: ["fa"], int: ["outdoorsy"] },
    { t: "Holiday lights drive", e: "🎄", cat: "seasonal", d: "Cocoa in cupholders, Christmas music, and a tour of the best-lit houses.", c: 0, m: 90, io: "mix", tr: 1, act: 0, crowd: 2, w: "en", age: 16, s: ["wi"], love: ["time", "touch"], int: ["cars"] },
    { t: "Gingerbread house build", e: "🏠", cat: "seasonal", d: "A kit, too much frosting, and a structural collapse or two.", c: 1, m: 90, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", s: ["wi"], int: ["artsy", "cooking"], fd: ["sweets", "gluten"] },
    { t: "Holiday market", e: "☃️", cat: "seasonal", d: "Stalls, twinkle lights and something warm to drink. Buy one tiny ornament.", c: 1, m: 120, io: "out", act: 3, crowd: 8, w: "en", s: ["wi"], need: ["city"], love: ["gifts", "time"] },
    { t: "Hot cocoa crawl", e: "☕", cat: "seasonal", d: "Rate the hot chocolate at three cafés. Whipped cream mandatory.", c: 1, m: 90, io: "in", act: 2, crowd: 4, w: "aen", s: ["wi"], fd: ["dairy", "sweets"] },
    { t: "Berry picking", e: "🍓", cat: "seasonal", d: "U-pick farm, sun hats, eat half of what you pick.", c: 1, m: 120, io: "out", tr: 2, act: 3, crowd: 3, w: "m", s: ["sp", "su"], int: ["outdoorsy"] },
    { t: "Flower fields", e: "🌻", cat: "seasonal", d: "Tulips in spring or sunflowers in summer. Take the photo everyone takes.", c: 1, m: 120, io: "out", tr: 2, act: 3, crowd: 5, w: "ma", s: ["sp", "su"], int: ["artsy"], love: ["time", "gifts"] },
    { t: "Outdoor movie in the park", e: "🎬", cat: "seasonal", d: "Free summer screenings: bring a blanket and snacks.", c: 0, m: 150, io: "out", act: 0, crowd: 6, w: "n", s: ["su"], love: ["touch", "time"] },
    { t: "Fireworks show", e: "🎆", cat: "seasonal", d: "Get there early, stake out a spot, and lie back for the finale.", c: 0, m: 120, io: "out", act: 1, crowd: 9, w: "n", s: ["su"], love: ["touch", "time"] },
    { t: "County fair", e: "🎡", cat: "seasonal", d: "Ferris wheel at sunset, fried everything, win a terrible prize.", c: 2, m: 240, io: "out", act: 4, adv: 5, crowd: 9, w: "aen", s: ["su", "fa"], love: ["time", "gifts"] },
    { t: "Jump in a leaf pile", e: "🍂", cat: "seasonal", d: "Rake the biggest pile you can, then ruin it immediately.", c: 0, m: 60, io: "out", tr: 0, act: 5, crowd: 0, w: "a", s: ["fa"], love: ["touch", "acts"] },

    // ---------- ADVENTURE / OUT AND ABOUT ----------
    { t: "Hot air balloon ride", e: "🎈", cat: "adventure", d: "Sunrise float over the valley. Once-in-a-lifetime kind of date.", c: 3, m: 240, io: "out", tr: 3, act: 1, adv: 9, crowd: 2, w: "m", love: ["gifts", "time"] },
    { t: "Day trip to a nearby town", e: "🗺️", cat: "adventure", d: "Pick a small town an hour away, find its best diner and its weirdest shop.", c: 2, m: 480, io: "mix", tr: 3, act: 3, adv: 6, crowd: 4, w: "m", age: 16, love: ["time"], int: ["cars"] },
    { t: "Random-direction drive", e: "🧭", cat: "adventure", d: "Drive 30 minutes in a direction chosen by coin flip. Explore wherever you land.", c: 1, m: 180, io: "mix", tr: 2, act: 2, adv: 8, crowd: 2, w: "a", age: 16, love: ["time"], int: ["cars"] },
    { t: "Yes day", e: "✅", cat: "adventure", d: "For one afternoon, you both say yes to every (reasonable) suggestion.", c: 1, m: 240, io: "mix", act: 4, adv: 9, crowd: 5, w: "a", love: ["time"] },
    { t: "Tourist in your own town", e: "📍", cat: "adventure", d: "Do every touristy thing locals never do. Take cheesy photos.", c: 1, m: 240, io: "mix", act: 4, adv: 5, crowd: 6, w: "ma", need: ["city"], love: ["time"] },
    { t: "Volunteer together", e: "🤝", cat: "adventure", d: "Food bank, park cleanup or animal shelter. Feels good, makes you closer.", c: 0, m: 180, io: "mix", act: 4, adv: 2, crowd: 5, w: "ma", love: ["acts", "time"] },
    { t: "Random acts of kindness", e: "💝", cat: "adventure", d: "$20 and an afternoon to make as many strangers smile as possible.", c: 1, m: 120, io: "mix", act: 3, adv: 5, crowd: 5, w: "a", love: ["acts", "gifts"] },
    { t: "Train ride somewhere", e: "🚆", cat: "adventure", d: "Hop a train or light rail to the end of the line and explore.", c: 1, m: 240, io: "mix", tr: 2, act: 2, adv: 6, crowd: 5, w: "ma", need: ["city"], love: ["time"] },
    { t: "Bucket list planning", e: "📝", cat: "home", d: "Each write 10 things you want to do together, then plan the first one.", c: 0, m: 60, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", love: ["words", "time"] },
    { t: "Sunrise photo shoot", e: "🌞", cat: "adventure", d: "Golden hour, nice outfits, and photos you'll actually want to keep.", c: 0, m: 90, io: "out", act: 2, adv: 3, crowd: 1, w: "m", int: ["artsy", "fashion"], love: ["time", "words"] },
    { t: "Night photography", e: "🌃", cat: "night", d: "City lights, long exposures, and light-painting your names.", c: 0, m: 120, io: "out", act: 2, adv: 5, crowd: 2, w: "n", need: ["city"], int: ["artsy", "nerdy"] },
    { t: "Lakeside sunset paddle", e: "🌅", cat: "outdoors", d: "Rent a canoe for the last hour of light and drift.", c: 2, m: 90, io: "out", tr: 2, act: 4, adv: 4, crowd: 2, w: "e", s: ["su"], need: ["lake"], love: ["time", "touch"] },
    { t: "Boardwalk & arcade", e: "🎠", cat: "outdoors", d: "Walk the shore, play the claw machine, share a funnel cake.", c: 2, m: 180, io: "mix", tr: 2, act: 3, crowd: 8, w: "aen", s: ["sp", "su", "fa"], need: ["coast"], int: ["gamer"], fd: ["sweets"] },
    { t: "Surf lesson", e: "🏄", cat: "active", d: "Book a beginner lesson. Standing up for one second counts.", c: 3, m: 150, io: "out", tr: 2, act: 9, adv: 9, crowd: 4, w: "m", s: ["su", "fa"], need: ["coast"], int: ["sporty"] },
    { t: "Ice castles or ice festival", e: "🧊", cat: "seasonal", d: "Lots of cold towns build ice castles or sculpture gardens. Go after dark.", c: 2, m: 120, io: "out", tr: 2, act: 3, adv: 5, crowd: 6, w: "en", s: ["wi"], need: ["snow"], love: ["time", "touch"] },
    { t: "Canyon drive & picnic", e: "🏔️", cat: "outdoors", d: "Wind up a canyon road, pull over at a pretty spot, eat sandwiches by the creek.", c: 1, m: 240, io: "out", tr: 2, act: 2, adv: 4, crowd: 2, w: "a", age: 16, s: ["sp", "su", "fa"], need: ["mountains"], love: ["time"], int: ["cars"] },
    { t: "Reservoir swim spot", e: "🌊", cat: "outdoors", d: "Find the local cliff-jump or swim spot locals love (safely!).", c: 0, m: 180, io: "out", tr: 2, act: 6, adv: 8, crowd: 4, w: "a", s: ["su"], need: ["lake"], int: ["outdoorsy", "sporty"] },

    // ---------- ANIMALS ----------
    { t: "Hike with your dogs", e: "🐕", cat: "outdoors", d: "Bring the dogs (or borrow a friend's) on a dog-friendly trail.", c: 0, m: 150, io: "out", tr: 2, act: 6, adv: 4, crowd: 2, w: "ma", s: ["sp", "su", "fa"], need: ["trails"], int: ["animals", "outdoorsy"], love: ["time"] },
    { t: "Butterfly house", e: "🦋", cat: "culture", d: "Stand very still and see who gets landed on first.", c: 2, m: 90, io: "in", act: 1, crowd: 4, w: "ma", need: ["city"], int: ["animals", "nerdy"], love: ["time"] },
    { t: "Goat yoga", e: "🐐", cat: "active", d: "Yoga, but tiny goats climb on you. It's exactly as funny as it sounds.", c: 2, m: 60, io: "out", tr: 2, act: 4, adv: 6, crowd: 5, w: "m", s: ["sp", "su", "fa"], int: ["animals", "sporty"], love: ["time"] },
    { t: "Feed the ducks", e: "🦆", cat: "outdoors", d: "Bring duck-safe food (oats or peas), find a pond, make friends.", c: 0, m: 45, io: "out", act: 1, crowd: 2, w: "ma", need: ["lake"], int: ["animals"], love: ["time"] },
    { t: "Wildlife refuge drive", e: "🦌", cat: "outdoors", d: "Slow drive or walk through a refuge with binoculars. Count every animal.", c: 0, m: 150, io: "mix", tr: 2, act: 2, adv: 3, crowd: 1, w: "me", int: ["animals", "outdoorsy", "nerdy"], love: ["time"] },
    { t: "Owl prowl night walk", e: "🦉", cat: "outdoors", d: "Lots of nature centers run guided night walks to hear owls and see bats.", c: 1, m: 90, io: "out", tr: 2, act: 3, adv: 5, crowd: 2, w: "n", int: ["animals", "nerdy", "outdoorsy"], love: ["touch", "time"] },
    { t: "Dog-friendly patio brunch", e: "🐶", cat: "food", d: "Pick a café that welcomes dogs and people-watch the pups.", c: 2, m: 90, io: "out", food: 6, crowd: 5, w: "m", s: ["sp", "su", "fa"], int: ["animals"], love: ["time"] },
    { t: "Pet adoption event visit", e: "🐾", cat: "culture", d: "Meet every puppy and kitten at an adoption event. Try not to adopt one.", c: 0, m: 60, io: "in", act: 1, crowd: 4, w: "a", int: ["animals"], love: ["touch", "time"] },

    // ---------- CARS ----------
    { t: "Car wash & detail date", e: "🧽", cat: "home", d: "Wash and detail one of your cars together. Water fight optional.", c: 1, m: 90, io: "out", tr: 0, act: 4, crowd: 0, w: "a", s: ["sp", "su", "fa"], int: ["cars"], love: ["acts", "time"] },
    { t: "Dirt track or drag race night", e: "🏁", cat: "culture", d: "Loud engines, cheap seats, stadium hot dogs. Pick a driver to root for.", c: 2, m: 180, io: "out", tr: 2, act: 2, adv: 5, crowd: 8, w: "en", s: ["sp", "su", "fa"], int: ["cars", "sporty"] },
    { t: "Learn car basics together", e: "🔧", cat: "home", d: "Check the oil, change a tire, swap wipers. Useful and weirdly fun.", c: 0, m: 75, io: "out", tr: 0, act: 3, adv: 3, crowd: 0, w: "a", int: ["cars", "nerdy"], love: ["acts"] },
    { t: "Auto museum", e: "🚘", cat: "culture", d: "Each pick the car you'd drive off in if no one was looking.", c: 2, m: 120, io: "in", act: 2, crowd: 3, w: "a", need: ["city"], int: ["cars", "nerdy"] },
    { t: "Classic car cruise night", e: "🚙", cat: "culture", d: "Summer cruise nights line the streets with old cars. Grab a shake and stroll.", c: 0, m: 120, io: "out", act: 2, crowd: 7, w: "e", s: ["su"], int: ["cars"], fd: ["dairy"] },
    { t: "Monster truck show", e: "🛻", cat: "culture", d: "Earplugs in, nachos out, absolute chaos.", c: 2, m: 180, io: "in", tr: 2, act: 1, adv: 5, crowd: 10, w: "en", int: ["cars"] },
    { t: "Gas-station snack road trip", e: "⛽", cat: "adventure", d: "Drive an hour out; at every stop each person buys the other a mystery snack.", c: 1, m: 240, io: "mix", tr: 3, act: 1, adv: 6, crowd: 2, w: "a", age: 16, int: ["cars"], love: ["gifts", "time"] },
    { t: "Audiobook drive", e: "🎧", cat: "adventure", d: "Start a short mystery audiobook and drive until you find out who did it.", c: 0, m: 180, io: "mix", tr: 2, act: 0, adv: 3, crowd: 0, w: "ae", age: 16, int: ["cars", "books"], love: ["time"] },

    // ---------- BOOKS ----------
    { t: "Library date", e: "📚", cat: "culture", d: "Get a card, find a cozy corner, and read the first chapter of each other's picks.", c: 0, m: 90, io: "in", act: 0, adv: 1, crowd: 1, w: "a", int: ["books", "nerdy"], love: ["time"] },
    { t: "Silent book club", e: "🤫", cat: "culture", d: "Café, two books, an hour of reading side by side, then talk about it.", c: 1, m: 120, io: "in", act: 0, adv: 1, crowd: 3, w: "ae", int: ["books"], love: ["time"] },
    { t: "Two-person book club", e: "📖", cat: "home", d: "Read the same short book this week, then discuss it over dinner.", c: 1, m: 120, io: "in", tr: 0, act: 0, crowd: 0, w: "e", int: ["books"], love: ["words", "time"] },
    { t: "Blind date with a book", e: "🎁", cat: "culture", d: "Wrap a book in paper, write three clues on it, and swap.", c: 1, m: 60, io: "in", act: 1, adv: 4, crowd: 2, w: "aen", int: ["books"], love: ["gifts"] },
    { t: "Author reading or signing", e: "✍️", cat: "culture", d: "Bookstores host free author nights. Get a signed copy for each other.", c: 1, m: 90, io: "in", act: 0, crowd: 5, w: "e", need: ["city"], int: ["books", "nerdy"], love: ["gifts"] },
    { t: "Write a short story together", e: "🖋️", cat: "home", d: "Take turns writing one paragraph at a time. Read the ending out loud.", c: 0, m: 75, io: "in", tr: 0, act: 0, adv: 3, crowd: 0, w: "aen", int: ["books", "artsy"], love: ["words", "time"] },
    { t: "Poetry night", e: "📜", cat: "culture", d: "A poetry slam or reading. Bonus: write each other one terrible poem.", c: 0, m: 120, io: "in", act: 0, adv: 4, crowd: 5, w: "en", int: ["books", "theater"], love: ["words"] },
    { t: "Used bookstore treasure hunt", e: "🔎", cat: "culture", d: "Find the oldest, weirdest or best-titled book in the shop.", c: 1, m: 75, io: "in", act: 1, adv: 3, crowd: 2, w: "a", int: ["books", "nerdy"], love: ["gifts"] },

    // ---------- FASHION ----------
    { t: "Dress each other at the mall", e: "👗", cat: "culture", d: "Pick a full outfit for each other in one store. Fashion show in the fitting room.", c: 1, m: 90, io: "in", act: 2, adv: 5, crowd: 6, w: "a", int: ["fashion"], love: ["gifts", "words"] },
    { t: "Vintage shopping crawl", e: "🕶️", cat: "culture", d: "Hit two or three vintage shops and find the best decade-specific piece.", c: 2, m: 120, io: "in", act: 2, adv: 4, crowd: 3, w: "a", need: ["city"], int: ["fashion", "artsy"], love: ["gifts"] },
    { t: "Make friendship bracelets", e: "📿", cat: "home", d: "Beads, string and a playlist. Make one for each other.", c: 1, m: 60, io: "in", tr: 0, act: 0, crowd: 0, w: "aen", int: ["fashion", "artsy"], love: ["gifts"] },
    { t: "Matching outfits day", e: "👯", cat: "adventure", d: "Coordinate outfits, then go somewhere public and own it.", c: 0, m: 180, io: "mix", act: 2, adv: 5, crowd: 5, w: "a", int: ["fashion"], love: ["time"] },
    { t: "Patch & upcycle a jacket", e: "🧵", cat: "home", d: "Iron-on patches, pins or paint to turn an old jacket into something new.", c: 1, m: 90, io: "in", tr: 0, act: 1, crowd: 0, w: "aen", int: ["fashion", "artsy"], love: ["gifts", "acts"] },
    { t: "City style photo shoot", e: "📷", cat: "culture", d: "Dress up, find murals and cool walls downtown, and take each other's photos.", c: 0, m: 90, io: "out", act: 3, adv: 3, crowd: 4, w: "ae", need: ["city"], int: ["fashion", "artsy"], love: ["words"] },
    { t: "Clothing swap party", e: "👚", cat: "home", d: "Invite friends to bring clothes they don't wear. Everyone leaves with something.", c: 0, m: 150, io: "in", tr: 0, act: 1, crowd: 5, w: "ae", int: ["fashion"], love: ["gifts"] },
    { t: "Window shopping & coffee", e: "🛍️", cat: "culture", d: "Stroll the nicest shopping street and pick out your dream wardrobes.", c: 1, m: 90, io: "mix", act: 3, crowd: 6, w: "a", int: ["fashion"], love: ["time"], fd: ["coffee"] },

    // ---------- COOKING ----------
    { t: "Farmers market cook-off", e: "🥬", cat: "food", d: "$15 each at the market, then cook a dish at home with whatever you bought.", c: 1, m: 180, io: "mix", food: 8, adv: 5, crowd: 4, w: "m", s: ["sp", "su", "fa"], int: ["cooking"], love: ["acts", "time"] },
    { t: "Fresh pasta from scratch", e: "🍝", cat: "food", d: "Flour, eggs and a rolling pin. Messy, slow and delicious.", c: 1, m: 150, io: "in", tr: 0, food: 8, crowd: 0, w: "e", int: ["cooking", "artsy"], love: ["time", "touch"], fd: ["gluten"] },
    { t: "Dumpling night", e: "🥟", cat: "food", d: "Fold dumplings together. The ugly ones taste the same.", c: 1, m: 120, io: "in", tr: 0, food: 8, crowd: 0, w: "e", int: ["cooking"], love: ["time"], fd: ["meat", "gluten"] },
    { t: "Build-your-own taco bar", e: "🫔", cat: "food", d: "Every topping you can think of, two tortilla options, zero rules.", c: 1, m: 90, io: "in", tr: 0, food: 7, crowd: 0, w: "e", int: ["cooking"], love: ["acts"], fd: ["meat", "spicy"] },
    { t: "Cookie decorating", e: "🍪", cat: "food", d: "Sugar cookies, piping bags and sprinkles. Decorate them like each other.", c: 1, m: 90, io: "in", tr: 0, food: 5, crowd: 0, w: "aen", int: ["cooking", "artsy"], love: ["time"], fd: ["sweets", "gluten"] },
    { t: "Mystery basket cook-off", e: "🧑‍🍳", cat: "food", d: "Each buys three random ingredients; the other has to make something with them.", c: 1, m: 120, io: "in", tr: 0, food: 7, adv: 6, crowd: 0, w: "e", int: ["cooking", "gamer"], love: ["acts"] },
    { t: "Homemade ice cream", e: "🍨", cat: "food", d: "Bag-in-a-bag ice cream or a cheap machine. Invent your own flavor.", c: 1, m: 60, io: "in", tr: 0, food: 6, crowd: 0, w: "a", s: ["sp", "su", "fa"], int: ["cooking", "nerdy"], love: ["time"], fd: ["dairy", "sweets"] },
    { t: "Bread baking day", e: "🍞", cat: "food", d: "Bake a loaf together, then eat it warm with butter. Worth the wait.", c: 1, m: 240, io: "in", tr: 0, food: 7, crowd: 0, w: "ma", int: ["cooking"], love: ["acts", "time"], fd: ["gluten"] },

    // ---------- THEATER & DANCE ----------
    { t: "Improv show", e: "🎭", cat: "culture", d: "Shout suggestions, watch strangers make up a show on the spot.", c: 1, m: 90, io: "in", act: 0, adv: 4, crowd: 6, w: "en", int: ["theater"] },
    { t: "Beginner improv class", e: "🙌", cat: "culture", d: "Drop-in improv classes are low-pressure and make you laugh until it hurts.", c: 2, m: 120, io: "in", act: 3, adv: 7, crowd: 5, w: "e", need: ["city"], int: ["theater"], love: ["time"] },
    { t: "Big Broadway-style musical", e: "🎟️", cat: "culture", d: "Touring shows come to most cities. Dress up and sing in the car after.", c: 3, m: 180, io: "in", tr: 2, act: 0, crowd: 8, w: "e", need: ["city"], int: ["theater", "musical"], love: ["gifts", "time"] },
    { t: "Murder mystery dinner", e: "🕵️", cat: "culture", d: "Play a character, solve the crime. Dinner theater, or at home with a kit.", c: 2, m: 180, io: "in", act: 1, adv: 5, crowd: 4, w: "e", int: ["theater", "gamer", "nerdy"] },
    { t: "Shakespeare in the park", e: "🌳", cat: "culture", d: "Free outdoor plays in summer. Blanket, snacks, and old-timey insults.", c: 0, m: 150, io: "out", act: 0, crowd: 6, w: "e", s: ["su"], int: ["theater", "books"], love: ["time", "touch"] },
    { t: "Ballet or dance show", e: "🩰", cat: "culture", d: "A ballet, a hip-hop showcase, or a college dance concert.", c: 2, m: 120, io: "in", act: 0, crowd: 6, w: "e", int: ["theater", "musical"], love: ["time"] },
    { t: "Reenact a movie scene", e: "🎥", cat: "home", d: "Pick a famous scene, learn the lines, film it, compare it to the original.", c: 0, m: 75, io: "in", tr: 0, act: 2, adv: 5, crowd: 0, w: "aen", int: ["theater", "artsy"], love: ["time"] },
    { t: "Local school play", e: "🎪", cat: "culture", d: "High school and college shows are cheap and surprisingly good.", c: 1, m: 150, io: "in", act: 0, crowd: 5, w: "e", int: ["theater"] },
    { t: "Living room dance-off", e: "🪩", cat: "home", d: "Take turns as DJ. Every song, a new dance style. Winner picks dinner.", c: 0, m: 45, io: "in", tr: 0, act: 6, adv: 4, crowd: 0, w: "en", int: ["theater", "musical"], love: ["touch"] },

    // ---------- MORE MUSIC ----------
    { t: "Silent disco", e: "🎧", cat: "night", d: "Wireless headphones, three DJ channels, and a room full of people dancing to silence.", c: 2, m: 120, io: "in", act: 6, adv: 5, crowd: 8, w: "n", need: ["city"], int: ["musical"], love: ["touch"] },
    { t: "Music festival", e: "🎡", cat: "culture", d: "Even a small local festival: a lineup, food trucks and a blanket on the grass.", c: 3, m: 360, io: "out", tr: 2, act: 5, adv: 5, crowd: 10, w: "aen", s: ["su"], int: ["musical"], love: ["time"] },
    { t: "Piano bar sing-along", e: "🎹", cat: "night", d: "Request songs, sing loudly, tip the piano player.", c: 2, m: 120, io: "in", act: 2, adv: 5, crowd: 6, w: "n", age: 21, int: ["musical"] },
    { t: "Vinyl listening night", e: "📀", cat: "home", d: "Each bring a few albums, lights low, listen start to finish, no phones.", c: 0, m: 120, io: "in", tr: 0, act: 0, crowd: 0, w: "en", int: ["musical"], love: ["time"] },
    { t: "Try a music lesson", e: "🥁", cat: "culture", d: "Lots of music shops offer a free trial lesson. Drums, guitar or piano.", c: 1, m: 60, io: "in", act: 3, adv: 5, crowd: 1, w: "ae", int: ["musical"], love: ["time"] },
    { t: "Symphony night", e: "🎼", cat: "culture", d: "Student tickets are cheap. Dress up a little and let the music take over.", c: 2, m: 150, io: "in", act: 0, crowd: 7, w: "e", need: ["city"], int: ["musical"], love: ["time", "touch"] },
    { t: "Name-that-tune game night", e: "🎶", cat: "home", d: "Take turns playing three-second song clips. Loser does the dishes.", c: 0, m: 60, io: "in", tr: 0, act: 0, crowd: 0, w: "en", int: ["musical", "gamer"], love: ["time"] },
    { t: "Rhythm game battle", e: "🎸", cat: "home", d: "Just Dance, Guitar Hero or any rhythm game. Rematch until someone cries.", c: 0, m: 90, io: "in", tr: 0, act: 5, crowd: 0, w: "en", int: ["musical", "gamer"], love: ["time"] },
  ];

  window.DateMe = window.DateMe || {};
  DateMe.IDEAS = IDEAS;

  // The built-in library is just the first "source". Others (places API, AI)
  // register the same way; see engine.js.
  DateMe.Engine.registerSource({
    id: "library",
    label: "Built-in ideas",
    getIdeas: async () => IDEAS,
  });
})();
