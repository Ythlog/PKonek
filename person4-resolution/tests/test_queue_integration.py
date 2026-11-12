import pytest
from sqlalchemy import text

from resolution.repositories.queue import queue_page


@pytest.fixture
def queue_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO departments(id,name) VALUES (951,'Queue Dept')"))
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (951,'Queue Cat',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES (951,1,'queue-cit@test.invalid','x','Q','Citizen'),(952,2,'queue-off@test.invalid','x','Q','Official')"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,assigned_department_id,title,description,latitude,longitude,submitted_at,due_at,ai_severity) VALUES "
          "(951,951,951,1,951,'Critical overdue','D',14,121,UTC_TIMESTAMP(3)-INTERVAL 2 DAY,UTC_TIMESTAMP(3)-INTERVAL 1 DAY,'critical'),"
          "(952,951,951,1,951,'Low upcoming','D',14,121,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)+INTERVAL 1 DAY,'low'),"
          "(953,951,951,1,951,'Null severity','D',14,121,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)+INTERVAL 2 DAY,NULL)"))
        conn.execute(text("INSERT INTO complaint_support(complaint_id,user_id) VALUES (951,952),(951,951)"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM complaint_support WHERE complaint_id BETWEEN 951 AND 953"))
        conn.execute(text("DELETE FROM complaints WHERE id BETWEEN 951 AND 953"))
        conn.execute(text("DELETE FROM users WHERE id IN (951,952)"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id=951"))
        conn.execute(text("DELETE FROM departments WHERE id=951"))


def test_queue_risk_order_counts_support_and_filters(queue_seed,mysql_test_engine):
    with mysql_test_engine.connect() as conn:
        items,total=queue_page(conn,user_id=952,department_id=951,is_admin=False,page=1,page_size=10)
        assert total==3 and [item['id'] for item in items]==[951,952,953]
        assert items[0]['is_overdue'] and items[0]['support_count']==2
        assert items[1]['time_left_seconds'] > 0
        assert queue_page(conn,user_id=952,department_id=951,is_admin=False,page=1,page_size=10,severity='low')[1]==1
        assert queue_page(conn,user_id=952,department_id=951,is_admin=False,page=1,page_size=10,overdue=True)[1]==1
        assert queue_page(conn,user_id=952,department_id=951,is_admin=False,page=1,page_size=10,assigned_to_me=True)[1]==0
