# 测试用例

## [分组名称]

### {{case.id}}: {{case.test_point}}

#### 📋 前置条件
{% for item in case.preconditions %}
- {{item}}
{% endfor %}

#### 🎬 请求步骤
{% for step in case.steps %}
{{loop.index}}. {{step}}
{% endfor %}

#### ✅ 预期结果
{% for result in case.expected_results %}
{{loop.index}}. {{result}}
{% endfor %}

#### 🗃️ 数据与一致性
- **测试数据标识**: {{case.test_data_id}}
- **请求前状态**: {{case.before_state}}
- **请求后状态**: {{case.after_state}}
- **清理方式**: {{case.cleanup}}
- **动态字段规则**: {{case.dynamic_field_rule}}

#### 📊 用例属性
- **优先级**: {{case.priority}}
- **测试类型**: {{case.test_type}}
- **自动化**: {{case.automation}}

---
