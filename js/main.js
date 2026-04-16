// ===========================
//   AI CS TUTOR — MAIN JS
// ===========================

// A set of pre-written CS explanations the tutor can give.
// In a real version, this would call an AI API (like Claude or OpenAI).
const responses = {
  "binary search": `
    <strong>Binary Search</strong> is an efficient algorithm for finding a value in a <em>sorted</em> list.<br><br>
    Instead of checking every element one by one, it cuts the list in half each time:<br>
    1. Look at the middle element<br>
    2. If it's your target → done! ✅<br>
    3. If your target is smaller → search the left half<br>
    4. If your target is bigger → search the right half<br>
    5. Repeat until found<br><br>
    <strong>Time complexity: O(log n)</strong> — very fast!
  `,
  "big o": `
    <strong>Big O notation</strong> describes how fast an algorithm is as the input grows.<br><br>
    Common ones:<br>
    • O(1) — Constant: same speed no matter the input size (e.g. looking up a dictionary entry)<br>
    • O(n) — Linear: speed grows with the input (e.g. reading every element once)<br>
    • O(n²) — Quadratic: speed grows fast (e.g. two nested loops)<br>
    • O(log n) — Logarithmic: very efficient (e.g. binary search)<br><br>
    Think of it as asking: "If my data got 10× bigger, how much slower would this be?"
  `,
  "recursion": `
    <strong>Recursion</strong> is when a function calls <em>itself</em> to solve a smaller version of the same problem.<br><br>
    Classic example — calculating factorial:<br>
    <code>factorial(5) = 5 × factorial(4)</code><br>
    <code>factorial(4) = 4 × factorial(3)</code><br>
    ...and so on until factorial(1) = 1<br><br>
    Every recursive function needs two things:<br>
    1. A <strong>base case</strong> — a condition that stops the recursion<br>
    2. A <strong>recursive case</strong> — the function calling itself with a simpler input<br><br>
    Without a base case, you'd get infinite recursion (a crash)!
  `,
  "array": `
    An <strong>array</strong> is one of the most fundamental data structures.<br><br>
    It stores a collection of elements in a <em>fixed-size, ordered sequence</em>.<br><br>
    Key properties:<br>
    • Each element has an <strong>index</strong> (position), starting at 0<br>
    • Accessing any element is O(1) — instant, regardless of size<br>
    • Inserting/deleting in the middle is O(n) — requires shifting elements<br><br>
    Example: <code>["Alice", "Bob", "Charlie"]</code><br>
    Index:   <code>[  0,      1,      2    ]</code><br><br>
    Arrays are the building block for many other data structures!
  `,
  "linked list": `
    A <strong>Linked List</strong> is a data structure made of <em>nodes</em>, each containing:<br>
    • The data value<br>
    • A pointer (link) to the next node<br><br>
    Unlike arrays, linked lists don't store elements in consecutive memory — they're connected by pointers.<br><br>
    Tradeoffs vs arrays:<br>
    ✅ Fast insert/delete at the beginning: O(1)<br>
    ❌ Slow access by index: O(n) — must start from the head and walk through<br>
    ❌ More memory (stores pointer for each node)<br><br>
    Good for: queues, implementing stacks, frequent insertions at start/end.
  `,
  "variable": `
    A <strong>variable</strong> is like a labeled box that stores a value in your program.<br><br>
    When you write: <code>let age = 21;</code><br>
    You're creating a box called "age" and putting the value 21 inside it.<br><br>
    Later you can:<br>
    • Read it: <code>console.log(age)</code> → prints 21<br>
    • Update it: <code>age = 22;</code> → now the box holds 22<br><br>
    Variables can hold many types of values: numbers, text (strings), true/false (booleans), lists (arrays), and more.
  `,
};

// The default response when we don't recognize the question
const defaultResponse = `
  That's a great question! This is a demo version of the AI CS Tutor.
  Try asking about: <strong>binary search</strong>, <strong>Big O notation</strong>,
  <strong>recursion</strong>, <strong>arrays</strong>, <strong>linked lists</strong>, or <strong>variables</strong>.<br><br>
  In a full version, I'd be powered by a real AI and could answer anything! 🚀
`;

// The main chat function — runs when you click "Send" or press Enter
function sendMessage() {
  const input = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");

  const userText = input.value.trim();
  if (!userText) return; // Don't send empty messages

  // 1. Display the user's message on the right
  const userBubble = document.createElement("div");
  userBubble.classList.add("message", "user-message");
  userBubble.textContent = userText;
  chatMessages.appendChild(userBubble);

  // 2. Clear the input box
  input.value = "";

  // 3. Show a "typing..." indicator
  const typingBubble = document.createElement("div");
  typingBubble.classList.add("message", "bot-message");
  typingBubble.textContent = "Thinking...";
  chatMessages.appendChild(typingBubble);

  // 4. Scroll to the bottom so the user sees new messages
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 5. Find a matching response (after a short delay to feel natural)
  setTimeout(() => {
    const lowerText = userText.toLowerCase();
    let reply = defaultResponse;

    // Check if any keyword matches the user's question
    for (const [keyword, explanation] of Object.entries(responses)) {
      if (lowerText.includes(keyword)) {
        reply = explanation;
        break;
      }
    }

    // Replace "Thinking..." with the actual answer
    typingBubble.innerHTML = reply;

    // Scroll down again after the reply appears
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 800);
}

// Allow pressing Enter to send a message (not just clicking the button)
document.getElementById("userInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});
