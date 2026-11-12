import pytest
from sqlalchemy import text

from resolution.repositories.admin_analytics import grouped_counts, overview


@pytest.fixture
def analytics_seed(mysql_test_engine):
    with mysql_test_engine.begin() as conn:
        conn.execute(text("INSERT INTO complaint_categories(id,name,default_sla_hours) VALUES (911,'Analytics A',24),(912,'Analytics B',24)"))
        conn.execute(text("INSERT INTO users(id,role_id,email,password_hash,first_name,last_name) VALUES (911,1,'analytics-cit@test.invalid','x','A','Citizen')"))
        conn.execute(text("INSERT INTO complaints(id,citizen_id,category_id,status_id,title,description,latitude,longitude,due_at,ai_severity) VALUES "
          "(911,911,911,(SELECT id FROM complaint_statuses WHERE code='in_progress'),'A','D',14,121,UTC_TIMESTAMP(3)-INTERVAL 1 DAY,'critical'),"
          "(912,911,911,(SELECT id FROM complaint_statuses WHERE code='resolved'),'B','D',14,121,UTC_TIMESTAMP(3)-INTERVAL 1 DAY,'low'),"
          "(913,911,912,(SELECT id FROM complaint_statuses WHERE code='reopened'),'C','D',14,121,NULL,NULL),"
          "(914,911,912,(SELECT id FROM complaint_statuses WHERE code='submitted'),'D','D',14,121,NULL,'high')"))
        conn.execute(text("INSERT INTO sla_events(complaint_id,event_type,escalation_level) VALUES (911,'escalated',1)"))
        conn.execute(text("INSERT INTO complaint_status_history(complaint_id,new_status_id,changed_by,change_source) VALUES "
          "(911,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),911,'official'),"
          "(913,(SELECT id FROM complaint_statuses WHERE code='resolved_pending_verification'),911,'official'),"
          "(913,(SELECT id FROM complaint_statuses WHERE code='reopened'),911,'citizen')"))
    yield
    with mysql_test_engine.begin() as conn:
        conn.execute(text("DELETE FROM sla_events WHERE complaint_id BETWEEN 911 AND 914"))
        conn.execute(text("DELETE FROM complaint_status_history WHERE complaint_id BETWEEN 911 AND 914"))
        conn.execute(text("DELETE FROM complaints WHERE id BETWEEN 911 AND 914"))
        conn.execute(text("DELETE FROM users WHERE id=911"))
        conn.execute(text("DELETE FROM complaint_categories WHERE id IN (911,912)"))


def test_admin_overview_cards_and_breakdowns(analytics_seed,mysql_test_engine):
    with mysql_test_engine.connect() as conn:
        cards=overview(conn)
        statuses=grouped_counts(conn,'status')
        categories=grouped_counts(conn,'category')
        severities=grouped_counts(conn,'severity')
    assert cards=={"total":4,"open":3,"overdue":1,"escalated":1,"resolved":1,"reopen_rate":50.0}
    assert {item['key']:item['count'] for item in statuses}=={"in_progress":1,"resolved":1,"reopened":1,"submitted":1}
    assert {item['label']:item['count'] for item in categories}=={"Analytics A":2,"Analytics B":2}
    assert {item['key']:item['count'] for item in severities}=={"critical":1,"low":1,"high":1,"unclassified":1}
