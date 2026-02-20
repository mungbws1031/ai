package com.example.simplemindmap

import android.content.ContentValues
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.core.view.drawToBitmap
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.util.Locale
import java.util.UUID
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                MindMapApp()
            }
        }
    }
}

data class MindMapNode(
    val id: String = UUID.randomUUID().toString(),
    val parentId: String?,
    var text: String,
    var x: Float,
    var y: Float
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MindMapApp() {
    val context = LocalContext.current
    val view = LocalView.current
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var inputText by remember { mutableStateOf("") }
    val nodes = remember { mutableStateListOf<MindMapNode>() }

    var selectedNodeId by remember { mutableStateOf<String?>(null) }
    var editText by remember { mutableStateOf("") }
    var addChildText by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        if (nodes.isEmpty()) {
            nodes += MindMapNode(parentId = null, text = "중앙 주제", x = 500f, y = 700f)
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Simple Mind Map") }) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                label = { Text("텍스트 입력 (긴 문장/키워드)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = {
                    nodes.clear()
                    nodes.addAll(generateMindMap(inputText))
                })
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {
                    nodes.clear()
                    nodes.addAll(generateMindMap(inputText))
                }) { Text("자동 생성") }
                Button(onClick = {
                    val pngName = "mindmap_${System.currentTimeMillis()}.png"
                    val bitmap = view.drawToBitmap(Bitmap.Config.ARGB_8888)
                    val uri = saveBitmap(context, bitmap, pngName)
                    scope.launch {
                        snackbarHostState.showSnackbar(if (uri != null) "PNG 저장 완료" else "PNG 저장 실패")
                    }
                }) { Text("PNG 내보내기") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {
                    val json = exportJson(nodes)
                    val uri = saveText(
                        context,
                        "mindmap_${System.currentTimeMillis()}.json",
                        "application/json",
                        json
                    )
                    scope.launch {
                        snackbarHostState.showSnackbar(if (uri != null) "JSON 저장 완료" else "JSON 저장 실패")
                    }
                }) { Text("JSON") }
                Button(onClick = {
                    val markdown = exportMarkdown(nodes)
                    val uri = saveText(
                        context,
                        "mindmap_${System.currentTimeMillis()}.md",
                        "text/markdown",
                        markdown
                    )
                    scope.launch {
                        snackbarHostState.showSnackbar(if (uri != null) "Markdown 저장 완료" else "Markdown 저장 실패")
                    }
                }) { Text("Markdown") }
            }

            MindMapCanvas(
                nodes = nodes,
                onMove = { id, dx, dy ->
                    nodes.indexOfFirst { it.id == id }
                        .takeIf { it >= 0 }
                        ?.let { index ->
                            nodes[index] = nodes[index].copy(
                                x = nodes[index].x + dx,
                                y = nodes[index].y + dy
                            )
                        }
                },
                onTapNode = { node ->
                    selectedNodeId = node.id
                    editText = node.text
                    addChildText = ""
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f))
                    .padding(8.dp)
            )
        }
    }

    val selectedNode = nodes.find { it.id == selectedNodeId }
    if (selectedNode != null) {
        AlertDialog(
            onDismissRequest = { selectedNodeId = null },
            title = { Text("노드 편집") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = editText,
                        onValueChange = { editText = it },
                        label = { Text("텍스트 수정") }
                    )
                    OutlinedTextField(
                        value = addChildText,
                        onValueChange = { addChildText = it },
                        label = { Text("하위 노드 추가") }
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val idx = nodes.indexOfFirst { it.id == selectedNode.id }
                    if (idx >= 0) {
                        nodes[idx] = nodes[idx].copy(text = editText.ifBlank { "(빈 노드)" })
                    }
                    if (addChildText.isNotBlank()) {
                        val childCount = nodes.count { it.parentId == selectedNode.id }
                        nodes += MindMapNode(
                            parentId = selectedNode.id,
                            text = addChildText,
                            x = selectedNode.x + 220f,
                            y = selectedNode.y + (childCount - 1) * 140f
                        )
                    }
                    selectedNodeId = null
                    Toast.makeText(context, "노드가 업데이트되었습니다.", Toast.LENGTH_SHORT).show()
                }) { Text("저장") }
            },
            dismissButton = {
                TextButton(onClick = {
                    nodes.removeAll { it.id == selectedNode.id || isDescendantOf(it, selectedNode.id, nodes) }
                    selectedNodeId = null
                }) { Text("삭제") }
            }
        )
    }
}

@Composable
private fun MindMapCanvas(
    nodes: List<MindMapNode>,
    onMove: (String, Float, Float) -> Unit,
    onTapNode: (MindMapNode) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val map = nodes.associateBy { it.id }
            nodes.forEach { node ->
                val parent = node.parentId?.let { map[it] }
                if (parent != null) {
                    val start = Offset(parent.x + 85f, parent.y + 24f)
                    val end = Offset(node.x + 10f, node.y + 24f)
                    val mid = (start.x + end.x) / 2f
                    drawLine(
                        color = Color(0xFF6C63FF),
                        start = start,
                        end = Offset(mid, start.y),
                        strokeWidth = 6f,
                        cap = StrokeCap.Round
                    )
                    drawLine(
                        color = Color(0xFF6C63FF),
                        start = Offset(mid, start.y),
                        end = Offset(mid, end.y),
                        strokeWidth = 6f,
                        cap = StrokeCap.Round
                    )
                    drawLine(
                        color = Color(0xFF6C63FF),
                        start = Offset(mid, end.y),
                        end = end,
                        strokeWidth = 6f,
                        cap = StrokeCap.Round
                    )
                }
            }
            drawRect(
                color = Color.Transparent,
                style = Stroke(width = 1f)
            )
        }

        nodes.forEach { node ->
            val animatedX by animateFloatAsState(targetValue = node.x, label = "nodeX")
            val animatedY by animateFloatAsState(targetValue = node.y, label = "nodeY")
            val highlight by animateColorAsState(
                if (node.parentId == null) Color(0xFFE2DDFF) else Color.White,
                label = "nodeColor"
            )

            ElevatedCard(
                modifier = Modifier
                    .offset { IntOffset(animatedX.roundToInt(), animatedY.roundToInt()) }
                    .size(width = 170.dp, height = 52.dp)
                    .border(1.dp, Color(0xFF6C63FF), RoundedCornerShape(12.dp))
                    .background(highlight, RoundedCornerShape(12.dp))
                    .pointerInput(node.id) {
                        detectDragGestures(
                            onDragEnd = {},
                            onDrag = { change, dragAmount ->
                                change.consume()
                                onMove(node.id, dragAmount.x, dragAmount.y)
                            },
                            onDragStart = {
                                onTapNode(node)
                            }
                        )
                    },
                shape = RoundedCornerShape(12.dp)
            ) {
                val density = LocalDensity.current
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(PaddingValues(horizontal = 10.dp, vertical = 6.dp)),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = node.text,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 2
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = if (node.parentId == null) "중심" else "하위",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6C63FF)
                    )
                }
            }
        }
    }
}

private fun generateMindMap(input: String): List<MindMapNode> {
    val fallback = listOf(
        "기획", "기능", "디자인", "개발", "테스트", "배포"
    )
    val clean = input.lowercase(Locale.getDefault()).replace("\n", " ")
    val tokens = Regex("[a-zA-Z가-힣0-9]{2,}").findAll(clean).map { it.value }.toList()
    val stopWords = setOf("그리고", "그러나", "합니다", "대한", "있는", "에서", "으로", "the", "and", "for", "with")
    val ranked = tokens
        .filterNot { it in stopWords }
        .groupingBy { it }
        .eachCount()
        .entries
        .sortedByDescending { it.value }
        .map { it.key }

    val rootText = ranked.firstOrNull()?.replaceFirstChar { it.uppercase() } ?: "중앙 주제"
    val children = (if (ranked.size > 1) ranked.drop(1) else fallback).take(6)

    val nodes = mutableListOf(MindMapNode(parentId = null, text = rootText, x = 420f, y = 560f))
    children.forEachIndexed { index, keyword ->
        val angleStep = (Math.PI * 2) / children.size.coerceAtLeast(1)
        val radius = 320f
        val x = 420f + (kotlin.math.cos(index * angleStep) * radius).toFloat()
        val y = 560f + (kotlin.math.sin(index * angleStep) * radius).toFloat()
        val child = MindMapNode(parentId = nodes.first().id, text = keyword, x = x, y = y)
        nodes += child

        val subKeywords = ranked.filter { it != keyword && it != rootText.lowercase() }.drop(index).take(2)
        subKeywords.forEachIndexed { subIndex, sub ->
            nodes += MindMapNode(
                parentId = child.id,
                text = sub,
                x = x + 180f,
                y = y + (subIndex - 0.5f) * 110f
            )
        }
    }
    return nodes
}

private fun isDescendantOf(node: MindMapNode, parentId: String, nodes: List<MindMapNode>): Boolean {
    var current = node.parentId
    val map = nodes.associateBy { it.id }
    while (current != null) {
        if (current == parentId) return true
        current = map[current]?.parentId
    }
    return false
}

private fun exportJson(nodes: List<MindMapNode>): String {
    val arr = JSONArray()
    nodes.forEach { node ->
        arr.put(
            JSONObject()
                .put("id", node.id)
                .put("parentId", node.parentId)
                .put("text", node.text)
                .put("x", node.x)
                .put("y", node.y)
        )
    }
    return JSONObject().put("nodes", arr).toString(2)
}

private fun exportMarkdown(nodes: List<MindMapNode>): String {
    val byParent = nodes.groupBy { it.parentId }
    val root = nodes.firstOrNull { it.parentId == null } ?: return "# Empty MindMap"

    fun render(node: MindMapNode, level: Int): String {
        val prefix = if (level == 0) "#" else "  ".repeat(level - 1) + "-"
        val line = "$prefix ${node.text}\n"
        val children = byParent[node.id].orEmpty().joinToString("") { render(it, level + 1) }
        return line + children
    }

    return render(root, 0)
}

private fun saveBitmap(context: android.content.Context, bitmap: Bitmap, fileName: String): Uri? {
    val resolver = context.contentResolver
    val contentValues = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
        put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MindMap")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
    }

    val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
    uri ?: return null

    return runCatching {
        resolver.openOutputStream(uri).use { stream ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            contentValues.clear()
            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(uri, contentValues, null, null)
        }
        uri
    }.getOrNull()
}

private fun saveText(context: android.content.Context, fileName: String, mimeType: String, content: String): Uri? {
    val resolver = context.contentResolver
    val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/MindMap")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
    }

    val uri = resolver.insert(MediaStore.Files.getContentUri("external"), values) ?: return null
    return writeToUri(resolver.openOutputStream(uri), content, uri, resolver, values)
}

private fun writeToUri(
    outputStream: OutputStream?,
    content: String,
    uri: Uri,
    resolver: android.content.ContentResolver,
    values: ContentValues
): Uri? {
    return runCatching {
        outputStream.use { stream ->
            stream?.write(content.toByteArray())
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.clear()
            values.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        }
        uri
    }.getOrNull()
}
