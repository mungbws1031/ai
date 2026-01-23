import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats
import seaborn as sns

# Set Korean font
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

def generate_global_lh_data(num_women=10000):
    """
    Generate synthetic LH data for 10,000 women globally
    Based on medical research:
    - Baseline LH: 2-10 mIU/mL (follicular phase)
    - Peak LH: 20-80 mIU/mL (ovulation)
    - Luteal phase: 1-15 mIU/mL
    """
    
    women_data = []
    
    for i in range(num_women):
        # Demographics
        age = np.random.choice([20, 25, 30, 35, 40, 45], p=[0.15, 0.25, 0.25, 0.20, 0.10, 0.05])
        ethnicity = np.random.choice(['Asian', 'Caucasian', 'African', 'Hispanic', 'Other'], 
                                     p=[0.30, 0.35, 0.15, 0.15, 0.05])
        
        # Cycle phase distribution
        cycle_phase = np.random.choice(['Follicular', 'Peak', 'Luteal'], p=[0.40, 0.15, 0.45])
        
        # Health condition
        has_pcos = np.random.random() < 0.10  # 10% PCOS prevalence
        
        # Generate LH levels based on phase and condition
        if cycle_phase == 'Follicular':
            if has_pcos:
                baseline_lh = np.random.normal(12, 4)  # Higher baseline for PCOS
            else:
                baseline_lh = np.random.normal(5, 2)
            lh_level = max(1, baseline_lh)
            
        elif cycle_phase == 'Peak':
            if has_pcos:
                peak_lh = np.random.normal(45, 15)
            else:
                peak_lh = np.random.normal(50, 15)
            lh_level = max(20, peak_lh)
            
        else:  # Luteal
            luteal_lh = np.random.normal(7, 3)
            lh_level = max(1, luteal_lh)
        
        # Age effect (slight decrease with age)
        age_factor = 1 - (age - 20) * 0.005
        lh_level *= age_factor
        
        # Ethnicity variation (minor differences based on research)
        ethnicity_factors = {
            'Asian': 0.95,
            'Caucasian': 1.0,
            'African': 1.05,
            'Hispanic': 0.98,
            'Other': 1.0
        }
        lh_level *= ethnicity_factors[ethnicity]
        
        women_data.append({
            'woman_id': i,
            'age': age,
            'ethnicity': ethnicity,
            'cycle_phase': cycle_phase,
            'has_pcos': has_pcos,
            'lh_level': round(lh_level, 2)
        })
    
    return pd.DataFrame(women_data)

# Generate data
print("Generating LH data for 10,000 women globally...")
df = generate_global_lh_data(10000)

# Save data
df.to_csv("global_lh_distribution_10k.csv", index=False)
print(f"[OK] Data saved: global_lh_distribution_10k.csv")

# Create comprehensive visualization
fig = plt.figure(figsize=(18, 12))
fig.suptitle('전세계 여성 10,000명 LH 수치 분포 분석', fontsize=20, fontweight='bold', y=0.98)

# ===== Chart 1: Overall LH Distribution (Histogram + Normal Curve) =====
ax1 = plt.subplot(2, 3, 1)
lh_values = df['lh_level'].values

# Histogram
n, bins, patches = ax1.hist(lh_values, bins=50, density=True, alpha=0.7, color='#2196F3', edgecolor='black')

# Fit normal distribution
mu, sigma = stats.norm.fit(lh_values)
x = np.linspace(lh_values.min(), lh_values.max(), 100)
ax1.plot(x, stats.norm.pdf(x, mu, sigma), 'r-', linewidth=2, label=f'정규분포\nμ={mu:.2f}, σ={sigma:.2f}')

ax1.set_xlabel('LH 수치 (mIU/mL)', fontsize=11, fontweight='bold')
ax1.set_ylabel('확률 밀도', fontsize=11, fontweight='bold')
ax1.set_title('전체 LH 수치 분포', fontsize=14, fontweight='bold', pad=20)
ax1.legend(fontsize=10)
ax1.grid(alpha=0.3)

# ===== Chart 2: LH by Cycle Phase (Box Plot) =====
ax2 = plt.subplot(2, 3, 2)

phases = ['Follicular', 'Peak', 'Luteal']
phase_data = [df[df['cycle_phase'] == phase]['lh_level'].values for phase in phases]
colors = ['#4CAF50', '#FF5722', '#FFC107']

bp = ax2.boxplot(phase_data, labels=phases, patch_artist=True, notch=True)
for patch, color in zip(bp['boxes'], colors):
    patch.set_facecolor(color)
    patch.set_alpha(0.7)

ax2.set_ylabel('LH 수치 (mIU/mL)', fontsize=11, fontweight='bold')
ax2.set_title('주기별 LH 수치 분포', fontsize=14, fontweight='bold', pad=20)
ax2.grid(axis='y', alpha=0.3)

# Add median values
for i, phase in enumerate(phases):
    median = df[df['cycle_phase'] == phase]['lh_level'].median()
    ax2.text(i+1, median, f'{median:.1f}', ha='center', va='bottom', fontweight='bold', fontsize=9)

# ===== Chart 3: LH by Age Group (Violin Plot) =====
ax3 = plt.subplot(2, 3, 3)

age_groups = sorted(df['age'].unique())
age_data = [df[df['age'] == age]['lh_level'].values for age in age_groups]

parts = ax3.violinplot(age_data, positions=range(len(age_groups)), showmeans=True, showmedians=True)
for pc in parts['bodies']:
    pc.set_facecolor('#9C27B0')
    pc.set_alpha(0.7)

ax3.set_xticks(range(len(age_groups)))
ax3.set_xticklabels([f'{age}세' for age in age_groups], fontsize=9)
ax3.set_ylabel('LH 수치 (mIU/mL)', fontsize=11, fontweight='bold')
ax3.set_title('연령대별 LH 수치 분포', fontsize=14, fontweight='bold', pad=20)
ax3.grid(axis='y', alpha=0.3)

# ===== Chart 4: LH by Ethnicity (Box Plot) =====
ax4 = plt.subplot(2, 3, 4)

ethnicities = df['ethnicity'].unique()
ethnicity_data = [df[df['ethnicity'] == eth]['lh_level'].values for eth in ethnicities]

bp2 = ax4.boxplot(ethnicity_data, labels=ethnicities, patch_artist=True)
for patch in bp2['boxes']:
    patch.set_facecolor('#FF9800')
    patch.set_alpha(0.7)

ax4.set_ylabel('LH 수치 (mIU/mL)', fontsize=11, fontweight='bold')
ax4.set_title('인종별 LH 수치 분포', fontsize=14, fontweight='bold', pad=20)
ax4.tick_params(axis='x', rotation=15)
ax4.grid(axis='y', alpha=0.3)

# ===== Chart 5: PCOS vs Normal (Density Plot) =====
ax5 = plt.subplot(2, 3, 5)

pcos_lh = df[df['has_pcos'] == True]['lh_level'].values
normal_lh = df[df['has_pcos'] == False]['lh_level'].values

ax5.hist(normal_lh, bins=40, density=True, alpha=0.6, color='#4CAF50', label='정상 (90%)')
ax5.hist(pcos_lh, bins=40, density=True, alpha=0.6, color='#F44336', label='PCOS (10%)')

ax5.set_xlabel('LH 수치 (mIU/mL)', fontsize=11, fontweight='bold')
ax5.set_ylabel('확률 밀도', fontsize=11, fontweight='bold')
ax5.set_title('PCOS vs 정상 LH 분포', fontsize=14, fontweight='bold', pad=20)
ax5.legend(fontsize=10)
ax5.grid(alpha=0.3)

# ===== Chart 6: Summary Statistics Table =====
ax6 = plt.subplot(2, 3, 6)
ax6.axis('off')

# Calculate statistics
stats_text = f"""
📊 통계 요약

전체 평균: {df['lh_level'].mean():.2f} mIU/mL
표준편차: {df['lh_level'].std():.2f} mIU/mL
중앙값: {df['lh_level'].median():.2f} mIU/mL

━━━━━━━━━━━━━━━━━━━━

주기별 평균:
• Follicular: {df[df['cycle_phase']=='Follicular']['lh_level'].mean():.2f}
• Peak: {df[df['cycle_phase']=='Peak']['lh_level'].mean():.2f}
• Luteal: {df[df['cycle_phase']=='Luteal']['lh_level'].mean():.2f}

━━━━━━━━━━━━━━━━━━━━

PCOS vs 정상:
• PCOS 평균: {df[df['has_pcos']==True]['lh_level'].mean():.2f}
• 정상 평균: {df[df['has_pcos']==False]['lh_level'].mean():.2f}

━━━━━━━━━━━━━━━━━━━━

연령 효과:
• 20대: {df[df['age']<=30]['lh_level'].mean():.2f}
• 30대: {df[(df['age']>30) & (df['age']<=40)]['lh_level'].mean():.2f}
• 40대: {df[df['age']>40]['lh_level'].mean():.2f}
"""

ax6.text(0.1, 0.9, stats_text, transform=ax6.transAxes,
        fontsize=11, verticalalignment='top', fontfamily='Malgun Gothic',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

plt.tight_layout()
plt.savefig('global_lh_distribution_analysis.png', dpi=300, bbox_inches='tight')
print("[OK] Visualization saved: global_lh_distribution_analysis.png")

# Print detailed statistics
print("\n=== DETAILED STATISTICS ===")
print(f"\nOverall LH Distribution:")
print(f"Mean: {df['lh_level'].mean():.2f} mIU/mL")
print(f"Std: {df['lh_level'].std():.2f} mIU/mL")
print(f"Median: {df['lh_level'].median():.2f} mIU/mL")
print(f"Min: {df['lh_level'].min():.2f} mIU/mL")
print(f"Max: {df['lh_level'].max():.2f} mIU/mL")

print(f"\nBy Cycle Phase:")
print(df.groupby('cycle_phase')['lh_level'].describe())

print(f"\nBy PCOS Status:")
print(df.groupby('has_pcos')['lh_level'].describe())

print(f"\nBy Ethnicity:")
print(df.groupby('ethnicity')['lh_level'].describe())

print("\nAnalysis complete!")
