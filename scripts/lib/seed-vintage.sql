-- Vintage sample inventory (Dubose Street Collection)
INSERT INTO books (isbn, title, author, publisher, description, quantity, available_quantity, shelf_location, section)
VALUES
 ('9780679783268','Pride and Prejudice','Jane Austen','Vintage Classics','Classic romance and social commentary.',5,5,'A','1'),
 ('9780140449266','Crime and Punishment','Fyodor Dostoevsky','Penguin Classics','Psychological exploration of morality.',4,4,'D','1'),
 ('9780141439600','Great Expectations','Charles Dickens','Penguin Classics','Growth and ambition in Victorian England.',3,3,'D','2'),
 ('9780140449136','The Brothers Karamazov','Fyodor Dostoevsky','Penguin','Faith, doubt, and ethics.',2,2,'D','3'),
 ('9780140449181','Anna Karenina','Leo Tolstoy','Penguin','Love, betrayal, and society.',4,4,'T','1'),
 ('9780140449198','War and Peace','Leo Tolstoy','Penguin','Epic historical novel.',2,2,'T','2'),
 ('9780140449273','Les Misérables','Victor Hugo','Penguin','Justice, grace, and redemption.',3,3,'H','1')
ON CONFLICT (isbn) DO NOTHING;
