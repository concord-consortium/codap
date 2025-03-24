# Why?

We should first ask ourselves why (or if) spending the time to write good interfaces matters. Is it really worth the investment in a fast paced environment (e.g. startup)? We think yes:

- Well designed interfaces result in localized changes [9]
- Well designed interfaces result in less "support" [5]
- Well designed interfaces are easier to learn for new teammates [3]

The essence is that good interfaces are *more scalable* than bad interfaces (in terms of people working on the API and people using it). Consequently, it can be important for a high-growth environment.

# What?

If we agree on the value of good interfaces, we should then talk about what makes an interface good or bad, and whether there are objective criteria for determining the goodness of an interface.

The first thing to get out of the way is that there is no perfect interface and how good an interface is can only be determined within the scope of use cases. For example, reading text via a byte stream is a poor interface for string processing, but could be a great interface for e.g. finding the first 0 bit.

Good interfaces generally satisfy many of the following properties:

- Easy to use correctly
- Hard to use incorrectly
- Unsurprising
- Reports actionable errors
- Fails fast
- Minimal boilerplate
- Consistent mental model or theory [3]
- Extensible (e.g. via plugins, inheritance, etc)
- Limited mutability
- Small (i.e. does "one" thing)
- Well documented
- No implementation details leaked
- Easy to learn and memorize

## Examples

Here we have a few examples of good and bad APIs

- **Python defaultdict**
    
    It's common to group a collection by some key. We often see folks write python code such as:
    
    ```python
    d = {}
    for word in words:
      first_letter = word[0]
      if first_letter in d:
    		d[first_letter].append(word)
    	else:
    		d[first_letter] = [word]
    ```
    
    But if we use`defaultdict` instead, we can see it's a much better fit for our use case:
    
    ```python
    d = defaultdict(list)
    for word in words:
    	first_letter = word[0]
    	d[first_letter].append(word)
    ```
    
    Important point is that python dicts are not necessarily a "bad API" — but when we consider our use case here, the standard dict API doesn't quite meet the mark!
    
- **Avoiding Roundtrips**
    
    Often, some APIs expose implementation or storage details of data. For example, if we wanted to fetch messages for users, it's not uncommon to see an API such as:
    
    ```java
    Collection<MessageId> messageIds = getUsers(userIds).messages;
    Collection<Message> messages = getMessages(messageIds);
    ```
    
    The reason APIs tend to look like this is that they generally just reflect how our services and such are organized. Note: code architecture and company org structure tend to change over time. Tying APIs to the data layout (rather than how it's consumed) is a recipe for a brittle API. Instead just give users what they want in a single step:
    
    ```java
    Collection<Message> messages = getMessagesForUsers(userIds);
    ```
    
- **Limit Mutability**
    
    In general, it's preferable to use immutable objects. Consider the following example:
    
    ```java
    
    Map<String, String> m = new HashMap<>();
    m.put("a", "b");
    
    int z = someFunc(m);
    
    assert m.containsKey("a"); // Does this pass or fail?
    ```
    
    When objects are mutable, any where they are passed is a place where it is potentially mutated. Mutable objects make it difficult to locally reason about code and generally results in situations where to understand *anything* you have to understand *everything* . I don't know about you, but I'm generally not smart enough to understand everything 😉. A better option would be to have `someFunc` take an `ImmutableMap` so that readers don't need to understand the function to know what the value of `m` might be later in the code!
    
- **Give Good Errors**
    
    We often see errors in the wild which don't provide a lot of information; for example:
    
    ```python
    IndexError: index out of range
    ```
    
    Good errors should have [7]:
    
    1. What input was wrong
    2. What is wrong about it
    3. How to fix it (or next steps for investigation)
    
    A better error message here would be:
    
    ```python
    IndexError: index=7 out of range for object (len=6) with items (showing first 3): 'apple', 'strawberry', 'banana', ...
    Did you forget to check that your index was not beyond the length of the object?
    ```
    
- **Returning Exceptional Values**
    
    In many cases, there's not a difference between returning something like `null` vs an empty collection. Consider the following interface:
    
    ```java
    // Returns null if no known favorite numbers
    List<Integer> getFavoriteNumbers(String name);
    
    // Example usage:
    List<Integer> gregFave = getFavoriteNumbers("greg");
    if (gregFave != null) {
      gregFave.forEach(System.out.println);
    }
    ```
    
    It may be better to return an empty List instead of null to simplify a user's code here. Note, that's not to say you should never return null. There are many cases where there is a legitimate and well-intentioned difference between null and empty List.
    
- **Make the interface hard to mis-use**
    
    Users shouldn't easily mis-use your API. One common error prone practice in APIs is initializing resources which callers are expected to release. For example:
    
    ```python
    f = open('myfile.txt', 'r')
    f.write("blah")
    f.close()
    ```
    
    It's really easy to forget that `close` ! Especially when we consider the possibility of exceptions that may occur between open and close. There are generally language-specific idioms to handle this; such as context managers in python:
    
    ```python
    with open('myfile.txt', 'r') as f:
      f.write("blah")
    # even if error occurs, the file context manager will ensure file is closed
    ```
    
    or in Java, the analogous pattern is [try with resources](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html).
    

See "How" section for some tips, tricks, and best practices for designing good APIs.

# Who? When? Where?

Every engineer writes interfaces [2, 5]. As a guideline, you should always try to write good interfaces. However, it is only a guideline; there are of course legitimate reasons to ignore the guideline. However, the guideline should be ignored consciously rather than haphazardly.

If you are choosing to build a worse-than-you-could API, consider the following actions to limit the effect:

- Use a non-public access modifier
- Document the costs or problems with the interface
- Mark the interface as experimental

# How?

We generally refer readers to Sean Parent [1], Scott Meyers [2], Joshua Bloch [5], and Jasmin Blanchette [8] for tips on writing good interfaces, but we leave a summary of advice below:

1. Get use cases to inform requirements
    - Drive the design based on use cases; remember, an interface can only be good within the context of use cases!
2. Get a tight feedback loop with users 
    - Write the API first (without implementation), make many examples and share with potential users. Bonus points if you yourself will be a user
    - These examples can later become test cases
    - Users are often ambivalent; find people who will use the API and provide you necessary/critical feedback
3. Keep the API as small as possible
    - Hyrum's Law: all observable behaviors of your implementation will be depended on by someone
4. Design for extensibility
    - Think about what users can extend via inheritance; block inheritance if your API is not designed for it
    - Think about what hooks/callbacks might be valuable
    - Accept interfaces instead of implementations in functions/methods
5. Keep implementation details out of the interface (where possible)
    - If you must include implementation details, keep it as separated as possible and use "scary" names to denote that users should generally stay away (e.g. `ImplementationSpecificParameters` )
6. Document every public entity: classes, methods, functions, variables
    - Bonus points for including example usage
    - Documentation should explain the "why"
7. Make errors actionable
8. Limit mutability

# References

1. [Better Code: Relationships](https://www.youtube.com/watch?v=ejF6qqohp3M) (Sean Parent, Adobe)
2. [The Most Important Design Guideline](https://www.aristeia.com/Papers/IEEE_Software_JulAug_2004_revised.htm) (Scott Meyers, Effective C++)
3. [Programming as Theory Building](https://gist.github.com/dpritchett/fd7115b6f556e40103ef) (Peter Naur, Turing Award)
4. [You Can't Tell People Anything](http://habitatchronicles.com/2004/04/you-cant-tell-people-anything/) (Chip Morningstar, industry veteran)
5. [How to Design a Good API and Why it Matters](https://www.youtube.com/watch?v=aAb7hSCtvGw) (Joshua Bloch, Effective Java)
6. [The Mythical Man-Month](https://web.eecs.umich.edu/~weimerw/2018-481/readings/mythical-man-month.pdf) (Fred Brooks, Turing Award)
7. [What makes a good API?](https://medium.com/@rkuris/good-apis-cd861b8b70a3) (Ron Kuris, industry veteran)
8. [The Little Manual of API Design](https://web.archive.org/web/20090520234149/http://chaos.troll.no/~shausman/api-design/api-design.pdf) (Jasmin Blanchette, Nokia / Qt)
9. [Coupling (Wikipedia)](https://en.wikipedia.org/wiki/Coupling_(computer_programming)#Disadvantages_of_tight_coupling)