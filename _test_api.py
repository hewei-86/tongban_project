import requests, json
base = 'http://localhost:8000'

def show(label, r):
    print(f'=== {label} ===')
    print(f'  [{r.status_code}] ', end='')
    try:
        d = r.json()
        if isinstance(d, list):
            print(f'(list, len={len(d)})')
        elif isinstance(d, dict):
            if 'detail' in d:
                print(f'ERROR: {d["detail"]}')
            else:
                print(f'OK keys={list(d.keys())[:6]}')
        else:
            print(d)
    except Exception:
        print(f'raw: {r.text[:100]}')
    print()

show('1. Dashboard', requests.get(f'{base}/api/dashboard'))
show('2. Daily Tasks', requests.get(f'{base}/api/tasks/daily'))
show('3. Checkin POST', requests.post(f'{base}/api/checkin', json={'user_id': 1}))
show('4. Streak', requests.get(f'{base}/api/checkin/streak?user_id=1'))
show('5. AI Chat', requests.post(f'{base}/api/ai/chat', json={'message': '1+1=?', 'grade': 3}))
show('6. Learning Submit', requests.post(f'{base}/api/learning/submit', json={'child_id': 1, 'question_id': 1, 'user_answer': '22', 'time_spent': 30}))
show('7. WrongBook GET', requests.get(f'{base}/api/wrong-book?child_id=1'))
show('8. WrongBook Master', requests.post(f'{base}/api/wrong-book/master/1'))
show('9. Achievements', requests.get(f'{base}/api/achievements?child_id=1'))
show('10. Parent Dashboard', requests.get(f'{base}/api/parent/dashboard?child_id=1'))
show('11. Harmony', requests.get(f'{base}/api/family/harmony?family_id=1'))
show('12. Leaderboard', requests.get(f'{base}/api/leaderboard?family_id=1'))
show('13. Weekly Report', requests.get(f'{base}/api/reports/weekly?child_id=1'))
show('14. Monthly Report', requests.get(f'{base}/api/reports/monthly?child_id=1'))
show('15. Goals POST', requests.post(f'{base}/api/goals', json={'child_id': 1, 'title': '本周完成20题', 'target_value': 20, 'deadline': '2025-12-31'}))
show('16. Goals GET', requests.get(f'{base}/api/goals?child_id=1'))
show('17. Goal Complete', requests.post(f'{base}/api/goals/1/complete'))
show('18. Practice Gen', requests.post(f'{base}/api/practice/generate', json={'subject': '数学', 'grade': 3, 'count': 3}))
show('19. TimeLimit POST', requests.post(f'{base}/api/time-limit', json={'child_id': 1, 'daily_limit_minutes': 60}))
show('20. Eval P->C', requests.post(f'{base}/api/evaluations', json={'family_id': 1, 'direction': 'parent_to_child', 'item': '耐心', 'score': 5, 'comment': '今天很认真!'}))
show('21. Eval C->P', requests.post(f'{base}/api/evaluations', json={'family_id': 1, 'direction': 'child_to_parent', 'item': '陪伴', 'score': 4, 'comment': '周末多陪我'}))
show('22. Eval List', requests.get(f'{base}/api/evaluations/list?family_id=1'))
show('23. Growth Curve', requests.get(f'{base}/api/growth-curve?child_id=1'))
show('24. Growth', requests.get(f'{base}/api/growth?child_id=1'))
show('25. Questions', requests.get(f'{base}/api/questions?subject=%E6%95%B0%E5%AD%A6&grade=3'))
show('26. Task Complete', requests.post(f'{base}/api/tasks/complete', json={'task_id': 1, 'child_id': 1, 'count': 5}))

print('ALL DONE!')
