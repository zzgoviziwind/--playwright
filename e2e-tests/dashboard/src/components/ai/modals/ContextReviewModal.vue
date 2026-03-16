<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="确认上下文"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="context-review">
      <p class="intro">以下是从项目中发现的 Page Objects、Fixtures 和测试数据：</p>

      <el-tabs>
        <!-- Page Objects -->
        <el-tab-pane label="Page Objects" name="pageObjects">
          <el-table :data="data?.pageObjects || []" stripe>
            <el-table-column prop="className" label="类名" width="180" />
            <el-table-column prop="filePath" label="路径" width="200" />
            <el-table-column label="Locators">
              <template #default="{ row }">{{ row.locatorCount }} 个</template>
            </el-table-column>
            <el-table-column label="Methods">
              <template #default="{ row }">{{ row.methodCount }} 个</template>
            </el-table-column>
            <el-table-column label="方法列表">
              <template #default="{ row }">
                <el-tag
                  v-for="method in row.methods.slice(0, 5)"
                  :key="method"
                  size="small"
                  style="margin-right: 4px"
                >
                  {{ method }}
                </el-tag>
                <span v-if="row.methods.length > 5" style="color: #909399">
                  +{{ row.methods.length - 5 }} 更多
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Auth Fixtures -->
        <el-tab-pane label="角色 Fixtures" name="authFixtures">
          <el-table :data="data?.authFixtures || []" stripe>
            <el-table-column prop="name" label="名称" width="180" />
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column prop="description" label="描述" />
          </el-table>
        </el-tab-pane>

        <!-- Data Fixtures -->
        <el-tab-pane label="数据 Fixtures" name="dataFixtures">
          <el-table :data="data?.dataFixtures || []" stripe>
            <el-table-column prop="name" label="名称" width="180" />
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column prop="description" label="描述" />
          </el-table>
        </el-tab-pane>

        <!-- Test Data -->
        <el-tab-pane label="测试数据" name="testData">
          <el-table :data="data?.testDataSchemas || []" stripe>
            <el-table-column prop="filePath" label="文件" width="200" />
            <el-table-column prop="summary" label="摘要" />
          </el-table>
        </el-tab-pane>

        <!-- Util Functions -->
        <el-tab-pane label="工具函数" name="utilFunctions">
          <el-table :data="data?.utilFunctions || []" stripe>
            <el-table-column prop="name" label="名称" width="180" />
            <el-table-column prop="signature" label="签名" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button type="danger" @click="$emit('abort')">中止</el-button>
      <el-button type="primary" @click="$emit('confirm')">确认继续</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  data: any;
}>();

const emit = defineEmits<{
  confirm: [];
  abort: [];
  'update:visible': [value: boolean];
}>();
</script>

<style scoped>
.context-review { max-height: 60vh; overflow-y: auto; }
.intro { margin-bottom: 16px; color: #606266; }
</style>
