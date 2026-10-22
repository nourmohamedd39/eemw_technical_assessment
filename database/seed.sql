INSERT INTO departments (name)
VALUES
    ('HR'),
    ('Finance'),
    ('IT'),
    ('Legal');

INSERT INTO users (name, email, department_id, role)
VALUES
    ('Ahmed Ali', 'ahmed@example.com', 1, 'employee'),
    ('Sarah Hassan', 'sarah@example.com', 2, 'employee'),
    ('Omar Mohamed', 'omar@example.com', 3, 'admin'),
    ('Mona Adel', 'mona@example.com', 4, 'employee');